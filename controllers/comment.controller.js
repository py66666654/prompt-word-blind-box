// 评论控制器
const { pool } = require('../config/database');
const { autoFilterContent, notifyModeratorsAboutFilteredContent } = require('../services/content-filter.service');

// 添加评论
exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promptId } = req.params;
    const { comment_text, parent_id } = req.body;

    // 验证评论内容
    if (!comment_text || comment_text.trim() === '') {
      return res.status(400).json({ message: '评论内容不能为空' });
    }

    // 检查提示词是否存在
    const [prompts] = await pool.query('SELECT id FROM prompt_cards WHERE id = ?', [promptId]);
    if (prompts.length === 0) {
      return res.status(404).json({ message: '提示词不存在' });
    }

    // 如果有父评论，检查父评论是否存在
    if (parent_id) {
      const [parentComments] = await pool.query(`
        SELECT c.id, c.user_id, u.username 
        FROM comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.id = ? AND c.prompt_card_id = ?
      `, [parent_id, promptId]);
      
      if (parentComments.length === 0) {
        return res.status(404).json({ message: '父评论不存在' });
      }
    }

    // 获取用户角色
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );
    
    // 默认状态为已批准，除非用户是管理员/超管
    let status = 'approved';
    
    // 检查用户是否是管理员或超管
    const isAdmin = users.length > 0 && ['moderator', 'admin', 'super_admin'].includes(users[0].role);

    // 插入评论
    const [result] = await pool.query(
      'INSERT INTO comments (user_id, prompt_card_id, comment_text, parent_id, status) VALUES (?, ?, ?, ?, ?)',
      [userId, promptId, comment_text, parent_id || null, status]
    );

    // 记录活动
    await recordActivity(userId, 'comment', result.insertId);

    // 如果不是管理员，执行内容过滤
    if (!isAdmin) {
      const filterResult = await autoFilterContent(comment_text, 'comment', result.insertId);
      
      // 如果内容未通过过滤
      if (!filterResult.passed) {
        // 通知管理员
        await notifyModeratorsAboutFilteredContent('comment', result.insertId, filterResult);
        
        // 如果内容被拒绝，立即返回错误
        if (filterResult.newStatus === 'rejected') {
          return res.status(403).json({
            message: '您的评论包含不适当内容，已被系统自动拒绝',
            reason: filterResult.rule.name
          });
        }
        
        // 更新评论状态为过滤后的状态
        status = filterResult.newStatus;
      }
    }

    // 如果是回复评论，发送通知给原评论作者
    if (parent_id) {
      const [parentComments] = await pool.query(
        'SELECT user_id FROM comments WHERE id = ?',
        [parent_id]
      );
      
      if (parentComments.length > 0 && parentComments[0].user_id !== userId) {
        await createNotification(
          parentComments[0].user_id, 
          userId, 
          'comment', 
          result.insertId,
          `有用户回复了您的评论`
        );
      }
    }

    // 获取新添加的评论（包含用户信息）
    const [comments] = await pool.query(`
      SELECT c.id, c.comment_text, c.created_at, c.status,
        u.id as user_id, u.username, u.profile_image,
        c.parent_id
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: '评论已添加',
      comment: comments[0],
      status: status
    });
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取提示词的评论
exports.getPromptComments = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 检查提示词是否存在
    const [prompts] = await pool.query('SELECT id FROM prompt_cards WHERE id = ?', [promptId]);
    if (prompts.length === 0) {
      return res.status(404).json({ message: '提示词不存在' });
    }

    // 获取顶级评论（不包含回复）
    const [comments] = await pool.query(`
      SELECT c.id, c.comment_text, c.created_at, c.updated_at,
        u.id as user_id, u.username, u.profile_image,
        (SELECT COUNT(*) FROM comments WHERE parent_id = c.id) as reply_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.prompt_card_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [promptId, parseInt(limit), parseInt(offset)]);

    // 获取总评论数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE prompt_card_id = ? AND parent_id IS NULL',
      [promptId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取评论的回复
exports.getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 检查评论是否存在
    const [comments] = await pool.query('SELECT id FROM comments WHERE id = ?', [commentId]);
    if (comments.length === 0) {
      return res.status(404).json({ message: '评论不存在' });
    }

    // 获取评论的回复
    const [replies] = await pool.query(`
      SELECT c.id, c.comment_text, c.created_at, c.updated_at,
        u.id as user_id, u.username, u.profile_image
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_id = ?
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `, [commentId, parseInt(limit), parseInt(offset)]);

    // 获取总回复数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE parent_id = ?',
      [commentId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      replies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取评论回复失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新评论
exports.updateComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;
    const { comment_text } = req.body;

    // 验证评论内容
    if (!comment_text || comment_text.trim() === '') {
      return res.status(400).json({ message: '评论内容不能为空' });
    }

    // 检查评论是否存在且属于当前用户
    const [comments] = await pool.query(
      'SELECT id FROM comments WHERE id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ message: '未找到评论或无权限修改' });
    }
    
    // 获取用户角色
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );
    
    // 检查用户是否是管理员或超管
    const isAdmin = users.length > 0 && ['moderator', 'admin', 'super_admin'].includes(users[0].role);

    // 更新评论
    await pool.query(
      'UPDATE comments SET comment_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [comment_text, commentId]
    );
    
    // 如果不是管理员，执行内容过滤
    if (!isAdmin) {
      const filterResult = await autoFilterContent(comment_text, 'comment', commentId);
      
      // 如果内容未通过过滤
      if (!filterResult.passed) {
        // 通知管理员
        await notifyModeratorsAboutFilteredContent('comment', commentId, filterResult);
        
        // 如果内容被拒绝，返回警告
        if (filterResult.newStatus === 'rejected') {
          return res.status(403).json({
            message: '您的评论包含不适当内容，已被系统自动拒绝',
            reason: filterResult.rule.name
          });
        }
      }
    }

    res.status(200).json({ 
      message: '评论已更新', 
      id: commentId
    });
  } catch (error) {
    console.error('更新评论失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除评论
exports.deleteComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;
    
    // 检查是否是管理员（简化版，实际应使用权限中间件）
    const isAdmin = false; // 此处应根据实际情况判断

    // 检查评论是否存在
    const [comments] = await pool.query(
      'SELECT id, user_id FROM comments WHERE id = ?',
      [commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ message: '评论不存在' });
    }

    // 检查权限（评论作者或管理员可删除）
    if (comments[0].user_id !== userId && !isAdmin) {
      return res.status(403).json({ message: '无权删除此评论' });
    }

    // 删除评论（连同子评论一起删除，依赖外键CASCADE）
    await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

    res.status(200).json({ message: '评论已删除' });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的所有评论
exports.getUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 检查用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取用户评论（包含提示词信息）
    const [comments] = await pool.query(`
      SELECT c.id, c.comment_text, c.created_at, c.updated_at, c.parent_id,
        pc.id as prompt_id, pc.prompt_text, pc.preview_url,
        pt.name as type_name, cat.name as category_name
      FROM comments c
      JOIN prompt_cards pc ON c.prompt_card_id = pc.id
      JOIN prompt_types pt ON pc.type_id = pt.id
      JOIN categories cat ON pc.category_id = cat.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // 获取总评论数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE user_id = ?',
      [userId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户评论列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 辅助函数：记录用户活动
async function recordActivity(userId, activityType, referenceId) {
  try {
    await pool.query(
      'INSERT INTO user_activities (user_id, activity_type, reference_id) VALUES (?, ?, ?)',
      [userId, activityType, referenceId]
    );
  } catch (error) {
    console.error('记录用户活动失败:', error);
    // 不抛出错误，避免影响主要功能
  }
}

// 辅助函数：创建通知
async function createNotification(userId, senderId, notificationType, referenceId, message) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, sender_id, notification_type, reference_id, message) VALUES (?, ?, ?, ?, ?)',
      [userId, senderId, notificationType, referenceId, message]
    );
  } catch (error) {
    console.error('创建通知失败:', error);
    // 不抛出错误，避免影响主要功能
  }
}