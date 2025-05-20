// 协作提示词控制器
const { pool } = require('../config/database');
const { autoFilterContent, notifyModeratorsAboutFilteredContent } = require('../services/content-filter.service');
const { notifyCollaborativeUpdate, sendGroupNotification } = require('../services/realtime.service');
const { sendToChannel } = require('../services/websocket.service');

// 创建协作提示词
exports.createCollaborativePrompt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, base_prompt_text, category_id, type_id } = req.body;
    
    // 验证请求数据
    if (!title || !base_prompt_text) {
      return res.status(400).json({ message: '标题和基础提示词为必填项' });
    }
    
    // 检查类别和类型是否存在（如果提供）
    if (category_id) {
      const [categories] = await pool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
      if (categories.length === 0) {
        return res.status(404).json({ message: '类别不存在' });
      }
    }
    
    if (type_id) {
      const [types] = await pool.query('SELECT id FROM prompt_types WHERE id = ?', [type_id]);
      if (types.length === 0) {
        return res.status(404).json({ message: '提示词类型不存在' });
      }
    }
    
    // 获取用户角色
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );
    
    // 检查用户是否是管理员或超管
    const isAdmin = users.length > 0 && ['moderator', 'admin', 'super_admin'].includes(users[0].role);
    
    // 设置状态（管理员创建的内容默认为活跃，普通用户创建的内容为草稿）
    const initialStatus = isAdmin ? 'active' : 'draft';
    
    // 创建协作提示词
    const [result] = await pool.query(`
      INSERT INTO collaborative_prompts (
        title, description, base_prompt_text, category_id, type_id, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, description || null, base_prompt_text, category_id || null, type_id || null, initialStatus, userId]);
    
    const collaborativePromptId = result.insertId;
    
    // 如果不是管理员，执行内容过滤
    if (!isAdmin) {
      // 对标题和提示词文本进行过滤
      const titleFilterResult = await autoFilterContent(title, 'collaborative', collaborativePromptId);
      const contentFilterResult = await autoFilterContent(base_prompt_text, 'collaborative', collaborativePromptId);
      
      // 如果任何内容未通过过滤
      if (!titleFilterResult.passed || !contentFilterResult.passed) {
        // 通知管理员
        if (!titleFilterResult.passed) {
          await notifyModeratorsAboutFilteredContent('collaborative', collaborativePromptId, titleFilterResult);
        }
        
        if (!contentFilterResult.passed) {
          await notifyModeratorsAboutFilteredContent('collaborative', collaborativePromptId, contentFilterResult);
        }
        
        // 如果内容被自动拒绝
        if ((titleFilterResult.newStatus === 'rejected' && !titleFilterResult.passed) || 
            (contentFilterResult.newStatus === 'rejected' && !contentFilterResult.passed)) {
          // 更新状态为已拒绝
          await pool.query('UPDATE collaborative_prompts SET status = ? WHERE id = ?', ['rejected', collaborativePromptId]);
          
          return res.status(403).json({
            message: '您的内容包含不适当内容，已被系统自动拒绝',
            reason: titleFilterResult.passed ? contentFilterResult.rule.name : titleFilterResult.rule.name
          });
        }
        
        // 如果内容被标记
        if ((titleFilterResult.newStatus === 'flagged' && !titleFilterResult.passed) || 
            (contentFilterResult.newStatus === 'flagged' && !contentFilterResult.passed)) {
          // 更新状态为已标记
          await pool.query('UPDATE collaborative_prompts SET status = ? WHERE id = ?', ['flagged', collaborativePromptId]);
        }
      }
    }
    
    // 添加创建者作为参与者（创建者角色）
    await pool.query(`
      INSERT INTO collaborative_participants (
        collaborative_prompt_id, user_id, role
      ) VALUES (?, ?, 'creator')
    `, [collaborativePromptId, userId]);
    
    // 获取新创建的协作提示词详情
    const [prompts] = await pool.query(`
      SELECT cp.*, 
        c.name as category_name, 
        pt.name as type_name,
        u.username as creator_username,
        u.profile_image as creator_profile_image
      FROM collaborative_prompts cp
      LEFT JOIN categories c ON cp.category_id = c.id
      LEFT JOIN prompt_types pt ON cp.type_id = pt.id
      JOIN users u ON cp.created_by = u.id
      WHERE cp.id = ?
    `, [collaborativePromptId]);
    
    if (prompts.length === 0) {
      return res.status(500).json({ message: '创建协作提示词后无法检索' });
    }
    
    res.status(201).json({
      message: '协作提示词创建成功',
      collaborative_prompt: prompts[0]
    });
  } catch (error) {
    console.error('创建协作提示词失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取协作提示词详情
exports.getCollaborativePromptDetails = async (req, res) => {
  try {
    const { promptId } = req.params;
    const userId = req.user ? req.user.id : null;
    
    // 获取协作提示词基本信息
    const [prompts] = await pool.query(`
      SELECT cp.*, 
        c.name as category_name, 
        pt.name as type_name,
        u.username as creator_username,
        u.profile_image as creator_profile_image
      FROM collaborative_prompts cp
      LEFT JOIN categories c ON cp.category_id = c.id
      LEFT JOIN prompt_types pt ON cp.type_id = pt.id
      JOIN users u ON cp.created_by = u.id
      WHERE cp.id = ?
    `, [promptId]);
    
    if (prompts.length === 0) {
      return res.status(404).json({ message: '协作提示词不存在' });
    }
    
    const prompt = prompts[0];
    
    // 获取参与者列表
    const [participants] = await pool.query(`
      SELECT cp.role, cp.joined_at,
        u.id as user_id, u.username, u.profile_image
      FROM collaborative_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.collaborative_prompt_id = ?
      ORDER BY 
        CASE cp.role
          WHEN 'creator' THEN 1
          WHEN 'editor' THEN 2
          WHEN 'viewer' THEN 3
        END,
        cp.joined_at
    `, [promptId]);
    
    prompt.participants = participants;
    
    // 获取修改记录
    const [edits] = await pool.query(`
      SELECT ce.*, 
        u.id as user_id, u.username, u.profile_image
      FROM collaborative_edits ce
      JOIN users u ON ce.user_id = u.id
      WHERE ce.collaborative_prompt_id = ?
      ORDER BY ce.created_at DESC
    `, [promptId]);
    
    prompt.edits = edits;
    
    // 如果用户已登录，检查权限
    if (userId) {
      const [userParticipation] = await pool.query(`
        SELECT role
        FROM collaborative_participants
        WHERE collaborative_prompt_id = ? AND user_id = ?
      `, [promptId, userId]);
      
      prompt.user_role = userParticipation.length > 0 ? userParticipation[0].role : null;
      prompt.can_view = userParticipation.length > 0 || prompt.status === 'completed';
      prompt.can_edit = userParticipation.length > 0 && 
                        (userParticipation[0].role === 'creator' || userParticipation[0].role === 'editor') && 
                        prompt.status === 'active';
    } else {
      prompt.user_role = null;
      prompt.can_view = prompt.status === 'completed';
      prompt.can_edit = false;
    }
    
    res.status(200).json(prompt);
  } catch (error) {
    console.error('获取协作提示词详情失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 提交编辑建议
exports.submitEdit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    const { edited_text, edit_comment } = req.body;
    
    // 验证请求数据
    if (!edited_text) {
      return res.status(400).json({ message: '编辑内容为必填项' });
    }
    
    // 检查协作提示词是否存在
    const [prompts] = await pool.query(`
      SELECT status
      FROM collaborative_prompts
      WHERE id = ?
    `, [promptId]);
    
    if (prompts.length === 0) {
      return res.status(404).json({ message: '协作提示词不存在' });
    }
    
    // 检查协作提示词状态
    if (prompts[0].status !== 'active') {
      return res.status(400).json({ message: '只能编辑处于活跃状态的协作提示词' });
    }
    
    // 检查用户是否有权限编辑
    const [participants] = await pool.query(`
      SELECT role
      FROM collaborative_participants
      WHERE collaborative_prompt_id = ? AND user_id = ?
    `, [promptId, userId]);
    
    if (participants.length === 0) {
      return res.status(403).json({ message: '您不是该协作提示词的参与者' });
    }
    
    if (participants[0].role === 'viewer') {
      return res.status(403).json({ message: '您只有查看权限，无法编辑' });
    }
    
    // 创建编辑记录
    const [result] = await pool.query(`
      INSERT INTO collaborative_edits (
        collaborative_prompt_id, user_id, edited_text, edit_comment
      ) VALUES (?, ?, ?, ?)
    `, [promptId, userId, edited_text, edit_comment || null]);
    
    // 获取新创建的编辑记录
    const [edits] = await pool.query(`
      SELECT ce.*, 
        u.id as user_id, u.username, u.profile_image
      FROM collaborative_edits ce
      JOIN users u ON ce.user_id = u.id
      WHERE ce.id = ?
    `, [result.insertId]);
    
    // 如果是创建者提交的编辑，自动批准
    if (participants[0].role === 'creator') {
      await pool.query(`
        UPDATE collaborative_edits
        SET approved = TRUE
        WHERE id = ?
      `, [result.insertId]);
      
      // 更新协作提示词的当前文本
      await pool.query(`
        UPDATE collaborative_prompts
        SET base_prompt_text = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [edited_text, promptId]);
      
      edits[0].approved = true;
    }
    
    res.status(201).json({
      message: '编辑提交成功',
      edit: edits[0]
    });
  } catch (error) {
    console.error('提交编辑失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 审核编辑建议
exports.reviewEdit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { editId } = req.params;
    const { approved } = req.body;
    
    // 验证请求数据
    if (approved === undefined) {
      return res.status(400).json({ message: '审核结果为必填项' });
    }
    
    // 获取编辑记录
    const [edits] = await pool.query(`
      SELECT ce.*, cp.id as prompt_id, cp.created_by
      FROM collaborative_edits ce
      JOIN collaborative_prompts cp ON ce.collaborative_prompt_id = cp.id
      WHERE ce.id = ?
    `, [editId]);
    
    if (edits.length === 0) {
      return res.status(404).json({ message: '编辑记录不存在' });
    }
    
    const edit = edits[0];
    
    // 检查用户是否是创建者
    if (edit.created_by !== userId) {
      return res.status(403).json({ message: '只有创建者可以审核编辑' });
    }
    
    // 更新编辑记录
    await pool.query(`
      UPDATE collaborative_edits
      SET approved = ?
      WHERE id = ?
    `, [approved, editId]);
    
    // 如果批准，更新协作提示词的当前文本
    if (approved) {
      await pool.query(`
        UPDATE collaborative_prompts
        SET base_prompt_text = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [edit.edited_text, edit.prompt_id]);
    }
    
    res.status(200).json({
      message: approved ? '编辑已批准' : '编辑已拒绝',
      edit_id: parseInt(editId),
      approved
    });
  } catch (error) {
    console.error('审核编辑失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 邀请参与者
exports.inviteParticipant = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    const { targetUserId, role } = req.body;
    
    // 验证请求数据
    if (!targetUserId || !role) {
      return res.status(400).json({ message: '用户ID和角色为必填项' });
    }
    
    // 验证角色
    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: '角色必须是 editor 或 viewer' });
    }
    
    // 检查协作提示词是否存在
    const [prompts] = await pool.query(`
      SELECT created_by, status
      FROM collaborative_prompts
      WHERE id = ?
    `, [promptId]);
    
    if (prompts.length === 0) {
      return res.status(404).json({ message: '协作提示词不存在' });
    }
    
    // 检查用户是否是创建者
    if (prompts[0].created_by !== userId) {
      return res.status(403).json({ message: '只有创建者可以邀请参与者' });
    }
    
    // 检查协作提示词状态
    if (prompts[0].status === 'completed' || prompts[0].status === 'archived') {
      return res.status(400).json({ message: '已完成或已归档的协作提示词不能添加参与者' });
    }
    
    // 检查目标用户是否存在
    const [targetUsers] = await pool.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (targetUsers.length === 0) {
      return res.status(404).json({ message: '目标用户不存在' });
    }
    
    // 检查是否已经是参与者
    const [existingParticipants] = await pool.query(`
      SELECT id, role
      FROM collaborative_participants
      WHERE collaborative_prompt_id = ? AND user_id = ?
    `, [promptId, targetUserId]);
    
    if (existingParticipants.length > 0) {
      // 更新现有参与者角色
      await pool.query(`
        UPDATE collaborative_participants
        SET role = ?
        WHERE id = ?
      `, [role, existingParticipants[0].id]);
      
      return res.status(200).json({
        message: '参与者角色已更新',
        role,
        previous_role: existingParticipants[0].role
      });
    }
    
    // 添加新参与者
    await pool.query(`
      INSERT INTO collaborative_participants (
        collaborative_prompt_id, user_id, role
      ) VALUES (?, ?, ?)
    `, [promptId, targetUserId, role]);
    
    // 更新协作提示词状态为活跃（如果当前是草稿状态）
    if (prompts[0].status === 'draft') {
      await pool.query(`
        UPDATE collaborative_prompts
        SET status = 'active'
        WHERE id = ?
      `, [promptId]);
    }
    
    // 创建通知
    await createParticipationNotification(targetUserId, userId, promptId);
    
    res.status(201).json({
      message: '参与者邀请成功',
      role
    });
  } catch (error) {
    console.error('邀请参与者失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的协作提示词
exports.getUserCollaborativePrompts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
    // 构建查询条件
    let whereClause = '';
    const queryParams = [userId];
    
    if (status !== 'all') {
      whereClause = 'AND cp.status = ?';
      queryParams.push(status);
    }
    
    // 获取协作提示词列表
    const [prompts] = await pool.query(`
      SELECT cp.id, cp.title, cp.description, cp.status, cp.created_at, cp.updated_at,
        CASE 
          WHEN cp.created_by = ? THEN 'creator'
          ELSE cpp.role
        END as user_role,
        c.name as category_name, 
        pt.name as type_name,
        u.username as creator_username,
        u.profile_image as creator_profile_image,
        (SELECT COUNT(*) FROM collaborative_participants WHERE collaborative_prompt_id = cp.id) as participant_count,
        (SELECT COUNT(*) FROM collaborative_edits WHERE collaborative_prompt_id = cp.id) as edit_count
      FROM collaborative_prompts cp
      LEFT JOIN categories c ON cp.category_id = c.id
      LEFT JOIN prompt_types pt ON cp.type_id = pt.id
      JOIN users u ON cp.created_by = u.id
      LEFT JOIN collaborative_participants cpp ON cp.id = cpp.collaborative_prompt_id AND cpp.user_id = ?
      WHERE (cp.created_by = ? OR cpp.user_id = ?)
      ${whereClause}
      ORDER BY cp.updated_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, userId, userId, ...queryParams, parseInt(limit), offset]);
    
    // 获取总记录数
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM collaborative_prompts cp
      LEFT JOIN collaborative_participants cpp ON cp.id = cpp.collaborative_prompt_id AND cpp.user_id = ?
      WHERE (cp.created_by = ? OR cpp.user_id = ?)
      ${whereClause}
    `, [userId, userId, userId, ...queryParams.slice(1)]);
    
    const total = countResult[0].total;
    
    res.status(200).json({
      prompts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取用户协作提示词失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 退出协作提示词
exports.leaveCollaborativePrompt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    
    // 检查协作提示词是否存在
    const [prompts] = await pool.query(`
      SELECT created_by
      FROM collaborative_prompts
      WHERE id = ?
    `, [promptId]);
    
    if (prompts.length === 0) {
      return res.status(404).json({ message: '协作提示词不存在' });
    }
    
    // 检查用户是否是创建者
    if (prompts[0].created_by === userId) {
      return res.status(400).json({ message: '创建者不能退出协作，请考虑归档或删除' });
    }
    
    // 检查用户是否是参与者
    const [participants] = await pool.query(`
      SELECT id
      FROM collaborative_participants
      WHERE collaborative_prompt_id = ? AND user_id = ?
    `, [promptId, userId]);
    
    if (participants.length === 0) {
      return res.status(404).json({ message: '您不是该协作提示词的参与者' });
    }
    
    // 删除参与者记录
    await pool.query(`
      DELETE FROM collaborative_participants
      WHERE id = ?
    `, [participants[0].id]);
    
    res.status(200).json({ message: '已退出协作提示词' });
  } catch (error) {
    console.error('退出协作提示词失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 完成协作提示词
exports.completeCollaborativePrompt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    
    // 检查协作提示词是否存在
    const [prompts] = await pool.query(`
      SELECT cp.id, cp.title, cp.base_prompt_text, cp.category_id, cp.type_id, cp.created_by, cp.status
      FROM collaborative_prompts cp
      WHERE cp.id = ?
    `, [promptId]);
    
    if (prompts.length === 0) {
      return res.status(404).json({ message: '协作提示词不存在' });
    }
    
    const prompt = prompts[0];
    
    // 检查用户是否是创建者
    if (prompt.created_by !== userId) {
      return res.status(403).json({ message: '只有创建者可以完成协作提示词' });
    }
    
    // 检查协作提示词状态
    if (prompt.status !== 'active') {
      return res.status(400).json({ message: '只有活跃状态的协作提示词可以被标记为完成' });
    }
    
    // 创建新的提示词卡片
    const metadata = {
      collaborative: true,
      collaborative_id: prompt.id,
      created_by: userId,
      contributors: []
    };
    
    // 获取所有贡献者
    const [contributors] = await pool.query(`
      SELECT DISTINCT ce.user_id, u.username
      FROM collaborative_edits ce
      JOIN users u ON ce.user_id = u.id
      WHERE ce.collaborative_prompt_id = ? AND ce.approved = TRUE
    `, [promptId]);
    
    // 添加贡献者到元数据
    contributors.forEach(contributor => {
      metadata.contributors.push({
        id: contributor.user_id,
        username: contributor.username
      });
    });
    
    // 为新卡片生成质量分数和稀有度
    // 协作卡片默认较高质量分数，基于参与人数和编辑次数
    const [editCount] = await pool.query(
      'SELECT COUNT(*) as count FROM collaborative_edits WHERE collaborative_prompt_id = ? AND approved = TRUE',
      [promptId]
    );
    
    const [participantCount] = await pool.query(
      'SELECT COUNT(*) as count FROM collaborative_participants WHERE collaborative_prompt_id = ?',
      [promptId]
    );
    
    // 质量分数计算：基础70分 + 编辑数*1.5 + 参与者数*2，最高100分
    let qualityScore = 70 + editCount[0].count * 1.5 + participantCount[0].count * 2;
    qualityScore = Math.min(100, Math.round(qualityScore));
    
    // 根据质量分数获取对应的稀有度等级
    const [rarityLevels] = await pool.query(`
      SELECT id
      FROM rarity_levels
      WHERE ? BETWEEN min_score AND max_score
    `, [qualityScore]);
    
    const rarityLevelId = rarityLevels.length > 0 ? rarityLevels[0].id : 3; // 默认为"精品"等级
    
    // 创建新的提示词卡片
    const [result] = await pool.query(`
      INSERT INTO prompt_cards (
        prompt_text, category_id, type_id, quality_score, rarity_level_id, source, is_ai_generated, metadata
      ) VALUES (
        ?, ?, ?, ?, ?, '协作创作', FALSE, ?
      )
    `, [
      prompt.base_prompt_text, 
      prompt.category_id, 
      prompt.type_id, 
      qualityScore, 
      rarityLevelId,
      JSON.stringify(metadata)
    ]);
    
    const promptCardId = result.insertId;
    
    // 更新协作提示词状态为已完成
    await pool.query(`
      UPDATE collaborative_prompts
      SET status = 'completed',
          completed_prompt_id = ?
      WHERE id = ?
    `, [promptCardId, promptId]);
    
    // 为所有贡献者创建通知
    const [participants] = await pool.query(`
      SELECT user_id
      FROM collaborative_participants
      WHERE collaborative_prompt_id = ? AND user_id != ?
    `, [promptId, userId]);
    
    for (const participant of participants) {
      await createCompletionNotification(participant.user_id, userId, promptId, prompt.title);
    }
    
    // 获取创建的提示词信息
    const [promptCards] = await pool.query(`
      SELECT pc.*, c.name as category_name, pt.name as type_name, rl.name as rarity_name, rl.color_code
      FROM prompt_cards pc
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN prompt_types pt ON pc.type_id = pt.id
      LEFT JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
      WHERE pc.id = ?
    `, [promptCardId]);
    
    res.status(200).json({
      message: '协作提示词已完成并转换为正式提示词卡片',
      prompt_card: promptCards[0]
    });
  } catch (error) {
    console.error('完成协作提示词失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 归档或删除协作提示词
exports.archiveOrDeleteCollaborativePrompt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    const { action } = req.body; // 'archive' 或 'delete'
    
    if (action !== 'archive' && action !== 'delete') {
      return res.status(400).json({ message: '操作必须是 archive 或 delete' });
    }
    
    // 检查协作提示词是否存在
    const [prompts] = await pool.query(`
      SELECT created_by, status
      FROM collaborative_prompts
      WHERE id = ?
    `, [promptId]);
    
    if (prompts.length === 0) {
      return res.status(404).json({ message: '协作提示词不存在' });
    }
    
    // 检查用户是否是创建者
    if (prompts[0].created_by !== userId) {
      return res.status(403).json({ message: '只有创建者可以归档或删除协作提示词' });
    }
    
    if (action === 'archive') {
      // 归档协作提示词
      await pool.query(`
        UPDATE collaborative_prompts
        SET status = 'archived'
        WHERE id = ?
      `, [promptId]);
      
      res.status(200).json({ message: '协作提示词已归档' });
    } else {
      // 删除协作提示词（包括相关的参与者和编辑记录）
      // 注意：外键约束应设置为 ON DELETE CASCADE
      await pool.query('DELETE FROM collaborative_prompts WHERE id = ?', [promptId]);
      
      res.status(200).json({ message: '协作提示词已删除' });
    }
  } catch (error) {
    console.error('归档或删除协作提示词失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取公开的协作提示词
exports.getPublicCollaborativePrompts = async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
    // 构建查询条件
    let whereClause = '';
    const queryParams = [];
    
    if (status !== 'all') {
      whereClause = 'WHERE cp.status = ?';
      queryParams.push(status);
    } else {
      whereClause = 'WHERE cp.status != "draft"'; // 草稿不公开
    }
    
    // 获取协作提示词列表
    const [prompts] = await pool.query(`
      SELECT cp.id, cp.title, cp.description, cp.status, cp.created_at, cp.updated_at,
        c.name as category_name, 
        pt.name as type_name,
        u.id as creator_id, u.username as creator_username, u.profile_image as creator_profile_image,
        (SELECT COUNT(*) FROM collaborative_participants WHERE collaborative_prompt_id = cp.id) as participant_count,
        (SELECT COUNT(*) FROM collaborative_edits WHERE collaborative_prompt_id = cp.id) as edit_count
      FROM collaborative_prompts cp
      LEFT JOIN categories c ON cp.category_id = c.id
      LEFT JOIN prompt_types pt ON cp.type_id = pt.id
      JOIN users u ON cp.created_by = u.id
      ${whereClause}
      ORDER BY 
        CASE cp.status
          WHEN 'active' THEN 1
          WHEN 'completed' THEN 2
          ELSE 3
        END,
        cp.updated_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);
    
    // 获取总记录数
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM collaborative_prompts cp
      ${whereClause}
    `, queryParams);
    
    const total = countResult[0].total;
    
    res.status(200).json({
      prompts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取公开协作提示词失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建参与通知
async function createParticipationNotification(userId, inviterId, promptId) {
  try {
    // 获取协作提示词标题和邀请者名称
    const [prompts] = await pool.query(`
      SELECT cp.title, u.username as inviter_name
      FROM collaborative_prompts cp
      JOIN users u ON cp.created_by = u.id
      WHERE cp.id = ?
    `, [promptId]);
    
    if (prompts.length === 0) return;
    
    const { title, inviter_name } = prompts[0];
    const message = `${inviter_name} 邀请您参与协作提示词「${title}」`;
    
    // 创建通知
    await pool.query(`
      INSERT INTO notifications (
        user_id, sender_id, notification_type, reference_id, message
      ) VALUES (
        ?, ?, 'system', ?, ?
      )
    `, [userId, inviterId, promptId, message]);
  } catch (error) {
    console.error('创建参与通知失败:', error);
  }
}

// 创建完成通知
async function createCompletionNotification(userId, creatorId, promptId, title) {
  try {
    // 获取创建者名称
    const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [creatorId]);
    if (users.length === 0) return;
    
    const message = `协作提示词「${title}」已由 ${users[0].username} 标记为完成`;
    
    // 创建通知
    await pool.query(`
      INSERT INTO notifications (
        user_id, sender_id, notification_type, reference_id, message
      ) VALUES (
        ?, ?, 'system', ?, ?
      )
    `, [userId, creatorId, promptId, message]);
  } catch (error) {
    console.error('创建完成通知失败:', error);
  }
}

module.exports = exports;