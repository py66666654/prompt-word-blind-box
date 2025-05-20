// 内容审核控制器
const { pool } = require('../config/database');
const { createNotification } = require('./notification.controller');
const { notifyContentModeration } = require('../services/realtime.service');

// 获取待审核内容
exports.getPendingContent = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { contentType, status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
    let query, countQuery, queryParams = [status];
    
    // 根据内容类型构建查询
    switch (contentType) {
      case 'prompt':
        query = `
          SELECT 
            p.id, p.prompt_text as content, p.category_id, p.type_id, p.preview_url,
            p.status, p.admin_notes, p.created_at, p.source, p.is_ai_generated,
            c.name as category_name, t.name as type_name,
            (SELECT COUNT(*) FROM content_reports WHERE content_type = 'prompt' AND content_id = p.id) as report_count
          FROM prompt_cards p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN prompt_types t ON p.type_id = t.id
          WHERE p.status = ?
          ORDER BY 
            report_count DESC,
            p.created_at ASC
          LIMIT ? OFFSET ?
        `;
        countQuery = 'SELECT COUNT(*) as total FROM prompt_cards WHERE status = ?';
        break;
        
      case 'comment':
        query = `
          SELECT 
            c.id, c.comment_text as content, c.prompt_card_id, c.parent_id,
            c.status, c.admin_notes, c.created_at, c.updated_at,
            u.id as user_id, u.username as username, u.profile_image,
            p.prompt_text,
            (SELECT COUNT(*) FROM content_reports WHERE content_type = 'comment' AND content_id = c.id) as report_count
          FROM comments c
          JOIN users u ON c.user_id = u.id
          JOIN prompt_cards p ON c.prompt_card_id = p.id
          WHERE c.status = ?
          ORDER BY 
            report_count DESC,
            c.created_at ASC
          LIMIT ? OFFSET ?
        `;
        countQuery = 'SELECT COUNT(*) as total FROM comments WHERE status = ?';
        break;
        
      case 'collaborative':
        query = `
          SELECT 
            cp.id, cp.title as content, cp.description, cp.base_prompt_text,
            cp.status, cp.created_at, cp.updated_at,
            u.id as user_id, u.username as creator_name,
            (SELECT COUNT(*) FROM content_reports WHERE content_type = 'collaborative' AND content_id = cp.id) as report_count
          FROM collaborative_prompts cp
          JOIN users u ON cp.created_by = u.id
          WHERE cp.status = ?
          ORDER BY 
            report_count DESC,
            cp.created_at ASC
          LIMIT ? OFFSET ?
        `;
        countQuery = 'SELECT COUNT(*) as total FROM collaborative_prompts WHERE status = ?';
        break;
        
      default:
        return res.status(400).json({ message: '无效的内容类型' });
    }
    
    // 执行查询
    const [contents] = await pool.query(query, [...queryParams, parseInt(limit), offset]);
    const [countResult] = await pool.query(countQuery, queryParams);
    
    res.status(200).json({
      contents,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取待审核内容失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新内容状态
exports.updateContentStatus = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { contentType, contentId } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!status || !['pending', 'approved', 'rejected', 'flagged'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }
    
    // 根据内容类型确定表名和关联字段
    let tableName, creatorField;
    
    switch (contentType) {
      case 'prompt':
        tableName = 'prompt_cards';
        creatorField = null; // 提示词没有明确的创建者字段
        break;
      case 'comment':
        tableName = 'comments';
        creatorField = 'user_id';
        break;
      case 'collaborative':
        tableName = 'collaborative_prompts';
        creatorField = 'created_by';
        break;
      default:
        return res.status(400).json({ message: '无效的内容类型' });
    }
    
    // 获取内容当前状态
    const [contents] = await pool.query(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [contentId]
    );
    
    if (contents.length === 0) {
      return res.status(404).json({ message: '内容不存在' });
    }
    
    const content = contents[0];
    const prevStatus = content.status || 'pending';
    
    // 更新内容状态
    const updateFields = ['status = ?'];
    const updateParams = [status];
    
    if (adminNotes !== undefined) {
      updateFields.push('admin_notes = ?');
      updateParams.push(adminNotes);
    }
    
    await pool.query(
      `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`,
      [...updateParams, contentId]
    );
    
    // 记录审核日志
    const action = status === 'approved' ? 'approve' :
                  status === 'rejected' ? 'reject' :
                  status === 'flagged' ? 'flag' : 'other';
                  
    await pool.query(
      'INSERT INTO moderation_logs (moderator_id, content_type, content_id, action, previous_status, new_status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, contentType, contentId, action, prevStatus, status, adminNotes || null]
    );
    
    // 如果内容被拒绝或批准，通知创建者
    if ((status === 'rejected' || status === 'approved') && creatorField && content[creatorField]) {
      let contentTypeName;
      switch (contentType) {
        case 'comment':
          contentTypeName = '评论';
          break;
        case 'collaborative':
          contentTypeName = '协作提示词';
          break;
        default:
          contentTypeName = '内容';
      }
      
      // 发送通知到数据库
      await createNotification(
        content[creatorField],
        req.user.id,
        'system',
        contentId,
        status === 'rejected' 
          ? `您的${contentTypeName}因违反社区规则已被移除${adminNotes ? `。原因：${adminNotes}` : ''}` 
          : `您的${contentTypeName}已通过审核`
      );
      
      // 发送实时通知
      await notifyContentModeration(
        contentType, 
        contentId, 
        status === 'rejected' ? 'reject' : 'approve',
        req.user.id,
        content[creatorField]
      );
    }
    
    // 处理关联的举报
    if (status === 'approved' || status === 'rejected') {
      await pool.query(
        'UPDATE content_reports SET status = ?, resolved_by = ?, resolved_at = NOW(), resolution_notes = ? WHERE content_type = ? AND content_id = ? AND status IN ("pending", "under_review")',
        [
          status === 'approved' ? 'rejected' : 'resolved',
          req.user.id,
          status === 'approved' ? '内容已审核并批准' : '内容已审核并移除',
          contentType,
          contentId
        ]
      );
    }
    
    res.status(200).json({ 
      message: `内容状态已更新为 ${status}`,
      previousStatus: prevStatus,
      newStatus: status
    });
  } catch (error) {
    console.error('更新内容状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 批量处理内容
exports.bulkModerateContent = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { contentType, items, action } = req.body;
    
    if (!contentType || !items || !Array.isArray(items) || items.length === 0 || !action) {
      return res.status(400).json({ message: '请提供有效的内容类型、内容ID列表和操作' });
    }
    
    if (!['approve', 'reject', 'flag'].includes(action)) {
      return res.status(400).json({ message: '无效的操作' });
    }
    
    // 确定表名和状态
    let tableName, creatorField;
    const status = action === 'approve' ? 'approved' : 
                  action === 'reject' ? 'rejected' : 'flagged';
                  
    switch (contentType) {
      case 'prompt':
        tableName = 'prompt_cards';
        creatorField = null;
        break;
      case 'comment':
        tableName = 'comments';
        creatorField = 'user_id';
        break;
      case 'collaborative':
        tableName = 'collaborative_prompts';
        creatorField = 'created_by';
        break;
      default:
        return res.status(400).json({ message: '无效的内容类型' });
    }
    
    // 开始事务
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    
    try {
      const results = {
        success: 0,
        failed: 0,
        notFound: []
      };
      
      // 对每个内容ID进行处理
      for (const itemId of items) {
        // 获取内容信息
        const [contents] = await conn.query(
          `SELECT * FROM ${tableName} WHERE id = ?`,
          [itemId]
        );
        
        if (contents.length === 0) {
          results.failed++;
          results.notFound.push(itemId);
          continue;
        }
        
        const content = contents[0];
        const prevStatus = content.status || 'pending';
        
        // 更新内容状态
        await conn.query(
          `UPDATE ${tableName} SET status = ? WHERE id = ?`,
          [status, itemId]
        );
        
        // 记录审核日志
        await conn.query(
          'INSERT INTO moderation_logs (moderator_id, content_type, content_id, action, previous_status, new_status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.user.id, contentType, itemId, action, prevStatus, status, '批量操作']
        );
        
        // 如果内容被拒绝，通知创建者
        if (action === 'reject' && creatorField && content[creatorField]) {
          let contentTypeName;
          switch (contentType) {
            case 'comment':
              contentTypeName = '评论';
              break;
            case 'collaborative':
              contentTypeName = '协作提示词';
              break;
            default:
              contentTypeName = '内容';
          }
          
          await conn.query(
            'INSERT INTO notifications (user_id, sender_id, notification_type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
            [
              content[creatorField],
              req.user.id,
              'system',
              itemId,
              `您的${contentTypeName}因违反社区规则已被移除`
            ]
          );
        }
        
        // 处理关联的举报
        if (action === 'approve' || action === 'reject') {
          await conn.query(
            'UPDATE content_reports SET status = ?, resolved_by = ?, resolved_at = NOW(), resolution_notes = ? WHERE content_type = ? AND content_id = ? AND status IN ("pending", "under_review")',
            [
              action === 'approve' ? 'rejected' : 'resolved',
              req.user.id,
              action === 'approve' ? '内容已审核并批准' : '内容已审核并移除',
              contentType,
              itemId
            ]
          );
        }
        
        results.success++;
      }
      
      // 提交事务
      await conn.commit();
      
      res.status(200).json({
        message: `批量操作完成: ${results.success} 个内容处理成功，${results.failed} 个内容处理失败`,
        results
      });
    } catch (error) {
      // 回滚事务
      await conn.rollback();
      throw error;
    } finally {
      // 释放连接
      conn.release();
    }
  } catch (error) {
    console.error('批量处理内容失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户审核相关信息
exports.getUserModerationInfo = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { userId } = req.params;
    
    // 获取用户基本信息
    const [users] = await pool.query(
      'SELECT id, username, email, created_at, profile_image, bio, points, role, status FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const user = users[0];
    
    // 获取用户处罚记录
    const [penalties] = await pool.query(`
      SELECT 
        up.id, up.penalty_type, up.reason, up.start_date, up.end_date, up.is_active,
        m.username as issued_by_username
      FROM user_penalties up
      LEFT JOIN users m ON up.issued_by = m.id
      WHERE up.user_id = ?
      ORDER BY up.start_date DESC
    `, [userId]);
    
    // 获取用户举报记录
    const [reportsSubmitted] = await pool.query(`
      SELECT 
        cr.id, cr.content_type, cr.content_id, cr.description, cr.status, cr.created_at,
        rt.name as report_type
      FROM content_reports cr
      JOIN report_types rt ON cr.report_type_id = rt.id
      WHERE cr.reporter_id = ?
      ORDER BY cr.created_at DESC
      LIMIT 20
    `, [userId]);
    
    // 获取用户被举报记录
    const [reportsReceived] = await pool.query(`
      SELECT 
        cr.id, cr.content_type, cr.content_id, cr.status, cr.created_at,
        rt.name as report_type,
        u.username as reporter_username
      FROM content_reports cr
      JOIN report_types rt ON cr.report_type_id = rt.id
      JOIN users u ON cr.reporter_id = u.id
      WHERE 
        (cr.content_type = 'user' AND cr.content_id = ?) OR
        (cr.content_type = 'comment' AND cr.content_id IN (SELECT id FROM comments WHERE user_id = ?)) OR
        (cr.content_type = 'collaborative' AND cr.content_id IN (SELECT id FROM collaborative_prompts WHERE created_by = ?))
      ORDER BY cr.created_at DESC
      LIMIT 20
    `, [userId, userId, userId]);
    
    // 获取用户内容数量
    const [commentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ?',
      [userId]
    );
    
    const [collaborativeCount] = await pool.query(
      'SELECT COUNT(*) as count FROM collaborative_prompts WHERE created_by = ?',
      [userId]
    );
    
    // 获取被举报的评论
    const [flaggedComments] = await pool.query(`
      SELECT 
        c.id, c.comment_text, c.prompt_card_id, c.created_at, c.status,
        p.prompt_text,
        (SELECT COUNT(*) FROM content_reports WHERE content_type = 'comment' AND content_id = c.id) as report_count
      FROM comments c
      JOIN prompt_cards p ON c.prompt_card_id = p.id
      WHERE c.user_id = ? AND c.status = 'flagged'
      ORDER BY report_count DESC, c.created_at DESC
      LIMIT 10
    `, [userId]);
    
    res.status(200).json({
      user,
      moderation_info: {
        penalties,
        content_counts: {
          comments: commentCount[0].count,
          collaborative_prompts: collaborativeCount[0].count
        },
        reports_submitted: reportsSubmitted,
        reports_received: reportsReceived,
        flagged_content: {
          comments: flaggedComments
        }
      }
    });
  } catch (error) {
    console.error('获取用户审核信息失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 添加用户处罚
exports.addUserPenalty = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { userId } = req.params;
    const { penaltyType, reason, endDate } = req.body;
    
    if (!penaltyType || !['warning', 'temp_ban', 'perm_ban', 'content_restriction'].includes(penaltyType)) {
      return res.status(400).json({ message: '无效的处罚类型' });
    }
    
    if (!reason) {
      return res.status(400).json({ message: '处罚原因为必填项' });
    }
    
    // 验证用户是否存在
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 如果是临时禁言，必须提供结束日期
    if (penaltyType === 'temp_ban' && !endDate) {
      return res.status(400).json({ message: '临时禁言必须提供结束日期' });
    }
    
    // 添加处罚记录
    const [result] = await pool.query(
      'INSERT INTO user_penalties (user_id, penalty_type, reason, issued_by, end_date) VALUES (?, ?, ?, ?, ?)',
      [userId, penaltyType, reason, req.user.id, endDate || null]
    );
    
    // 更新用户状态
    let newStatus;
    switch (penaltyType) {
      case 'warning':
        newStatus = 'warned';
        break;
      case 'temp_ban':
      case 'perm_ban':
        newStatus = 'banned';
        break;
      case 'content_restriction':
        newStatus = 'restricted';
        break;
    }
    
    await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [newStatus, userId]
    );
    
    // 发送通知给用户
    let penaltyTypeText;
    switch (penaltyType) {
      case 'warning':
        penaltyTypeText = '警告';
        break;
      case 'temp_ban':
        penaltyTypeText = '临时禁言';
        break;
      case 'perm_ban':
        penaltyTypeText = '永久禁言';
        break;
      case 'content_restriction':
        penaltyTypeText = '内容限制';
        break;
    }
    
    await createNotification(
      userId,
      req.user.id,
      'system',
      result.insertId,
      `您的账号收到${penaltyTypeText}。原因：${reason}`
    );
    
    res.status(201).json({
      message: `用户处罚已添加`,
      penaltyId: result.insertId
    });
  } catch (error) {
    console.error('添加用户处罚失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 撤销用户处罚
exports.revokeUserPenalty = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { penaltyId } = req.params;
    
    // 获取处罚信息
    const [penalties] = await pool.query(
      'SELECT * FROM user_penalties WHERE id = ?',
      [penaltyId]
    );
    
    if (penalties.length === 0) {
      return res.status(404).json({ message: '处罚记录不存在' });
    }
    
    const penalty = penalties[0];
    
    // 如果处罚已撤销，返回错误
    if (!penalty.is_active) {
      return res.status(400).json({ message: '该处罚已被撤销' });
    }
    
    // 撤销处罚
    await pool.query(
      'UPDATE user_penalties SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
      [penaltyId]
    );
    
    // 检查用户是否有其他活跃处罚
    const [activeCount] = await pool.query(
      'SELECT COUNT(*) as count FROM user_penalties WHERE user_id = ? AND is_active = TRUE',
      [penalty.user_id]
    );
    
    // 如果没有其他活跃处罚，恢复用户状态
    if (activeCount[0].count === 0) {
      await pool.query(
        'UPDATE users SET status = "active" WHERE id = ?',
        [penalty.user_id]
      );
    }
    
    // 发送通知给用户
    await createNotification(
      penalty.user_id,
      req.user.id,
      'system',
      penaltyId,
      `您的账号处罚已被撤销`
    );
    
    res.status(200).json({ message: '处罚已撤销' });
  } catch (error) {
    console.error('撤销用户处罚失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取内容审核规则
exports.getContentFilterRules = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['moderator', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const [rules] = await pool.query(`
      SELECT * FROM content_filter_rules
      ORDER BY severity DESC, is_active DESC, name
    `);
    
    res.status(200).json(rules);
  } catch (error) {
    console.error('获取内容审核规则失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 添加或更新内容审核规则
exports.updateContentFilterRule = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { ruleId } = req.params;
    const { name, description, filterType, pattern, action, severity, isActive } = req.body;
    
    if (!name || !filterType || !pattern || !action) {
      return res.status(400).json({ message: '名称、过滤类型、过滤模式和操作为必填项' });
    }
    
    if (!['keyword', 'regex', 'ai_model'].includes(filterType)) {
      return res.status(400).json({ message: '无效的过滤类型' });
    }
    
    if (!['flag', 'reject', 'require_review'].includes(action)) {
      return res.status(400).json({ message: '无效的操作' });
    }
    
    if (ruleId) {
      // 更新现有规则
      const [existingRules] = await pool.query(
        'SELECT * FROM content_filter_rules WHERE id = ?',
        [ruleId]
      );
      
      if (existingRules.length === 0) {
        return res.status(404).json({ message: '规则不存在' });
      }
      
      await pool.query(
        'UPDATE content_filter_rules SET name = ?, description = ?, filter_type = ?, pattern = ?, action = ?, severity = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
        [name, description, filterType, pattern, action, severity || 1, isActive === undefined ? true : isActive, ruleId]
      );
      
      res.status(200).json({ 
        message: '规则已更新',
        ruleId: parseInt(ruleId)
      });
    } else {
      // 创建新规则
      const [result] = await pool.query(
        'INSERT INTO content_filter_rules (name, description, filter_type, pattern, action, severity, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, description, filterType, pattern, action, severity || 1, isActive === undefined ? true : isActive]
      );
      
      res.status(201).json({
        message: '规则已创建',
        ruleId: result.insertId
      });
    }
  } catch (error) {
    console.error('更新内容审核规则失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除内容审核规则
exports.deleteContentFilterRule = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { ruleId } = req.params;
    
    // 验证规则是否存在
    const [rules] = await pool.query(
      'SELECT * FROM content_filter_rules WHERE id = ?',
      [ruleId]
    );
    
    if (rules.length === 0) {
      return res.status(404).json({ message: '规则不存在' });
    }
    
    // 删除规则
    await pool.query(
      'DELETE FROM content_filter_rules WHERE id = ?',
      [ruleId]
    );
    
    res.status(200).json({ message: '规则已删除' });
  } catch (error) {
    console.error('删除内容审核规则失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 管理社区指南
exports.manageCommunityGuidelines = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { method, guidelineId } = req.body;
    
    if (!method || !['add', 'update', 'delete', 'toggle'].includes(method)) {
      return res.status(400).json({ message: '无效的操作方法' });
    }
    
    // 处理添加新指南
    if (method === 'add') {
      const { title, content, category } = req.body;
      
      if (!title || !content || !category) {
        return res.status(400).json({ message: '标题、内容和分类为必填项' });
      }
      
      const [result] = await pool.query(
        'INSERT INTO community_guidelines (title, content, category, is_active) VALUES (?, ?, ?, TRUE)',
        [title, content, category]
      );
      
      res.status(201).json({
        message: '社区指南已添加',
        guidelineId: result.insertId
      });
    }
    // 处理更新指南
    else if (method === 'update') {
      if (!guidelineId) {
        return res.status(400).json({ message: '指南ID为必填项' });
      }
      
      const { title, content, category } = req.body;
      
      if (!title && !content && !category) {
        return res.status(400).json({ message: '请提供至少一个要更新的字段' });
      }
      
      // 验证指南是否存在
      const [guidelines] = await pool.query(
        'SELECT * FROM community_guidelines WHERE id = ?',
        [guidelineId]
      );
      
      if (guidelines.length === 0) {
        return res.status(404).json({ message: '指南不存在' });
      }
      
      const updateFields = [];
      const updateParams = [];
      
      if (title) {
        updateFields.push('title = ?');
        updateParams.push(title);
      }
      
      if (content) {
        updateFields.push('content = ?');
        updateParams.push(content);
      }
      
      if (category) {
        updateFields.push('category = ?');
        updateParams.push(category);
      }
      
      updateFields.push('updated_at = NOW()');
      
      await pool.query(
        `UPDATE community_guidelines SET ${updateFields.join(', ')} WHERE id = ?`,
        [...updateParams, guidelineId]
      );
      
      res.status(200).json({ message: '指南已更新' });
    }
    // 处理删除指南
    else if (method === 'delete') {
      if (!guidelineId) {
        return res.status(400).json({ message: '指南ID为必填项' });
      }
      
      // 验证指南是否存在
      const [guidelines] = await pool.query(
        'SELECT * FROM community_guidelines WHERE id = ?',
        [guidelineId]
      );
      
      if (guidelines.length === 0) {
        return res.status(404).json({ message: '指南不存在' });
      }
      
      // 删除指南
      await pool.query(
        'DELETE FROM community_guidelines WHERE id = ?',
        [guidelineId]
      );
      
      res.status(200).json({ message: '指南已删除' });
    }
    // 处理切换指南启用状态
    else if (method === 'toggle') {
      if (!guidelineId) {
        return res.status(400).json({ message: '指南ID为必填项' });
      }
      
      // 验证指南是否存在
      const [guidelines] = await pool.query(
        'SELECT * FROM community_guidelines WHERE id = ?',
        [guidelineId]
      );
      
      if (guidelines.length === 0) {
        return res.status(404).json({ message: '指南不存在' });
      }
      
      // 切换启用状态
      await pool.query(
        'UPDATE community_guidelines SET is_active = NOT is_active, updated_at = NOW() WHERE id = ?',
        [guidelineId]
      );
      
      res.status(200).json({ message: '指南状态已切换' });
    }
  } catch (error) {
    console.error('管理社区指南失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

module.exports = exports;