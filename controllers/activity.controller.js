// 用户活动控制器
const { pool } = require('../config/database');
const { broadcastActivity } = require('../services/realtime.service');

// 记录用户活动并发送实时通知
exports.recordActivity = async (userId, activityType, referenceId, activityData = null) => {
  try {
    // 记录活动到数据库
    const [result] = await pool.query(
      'INSERT INTO user_activities (user_id, activity_type, reference_id) VALUES (?, ?, ?)',
      [userId, activityType, referenceId]
    );
    
    // 广播活动到关注者
    await broadcastActivity(userId, activityType, {
      activity_id: result.insertId,
      reference_id: referenceId,
      ...activityData
    });
    
    return result.insertId;
  } catch (error) {
    console.error('记录用户活动失败:', error);
    return null;
  }
};

// 获取用户活动流
exports.getUserActivityFeed = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 验证用户是否存在
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取用户活动
    const [activities] = await pool.query(`
      SELECT 
        ua.id, ua.activity_type, ua.created_at,
        ua.reference_id,
        CASE 
          WHEN ua.activity_type = 'draw' THEN 
            (SELECT JSON_OBJECT(
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url,
              'type_name', pt.name,
              'category_name', c.name,
              'rarity_name', rl.name,
              'color_code', rl.color_code
            )
            FROM draw_history dh
            JOIN prompt_cards pc ON dh.prompt_card_id = pc.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE dh.id = ua.reference_id)
          WHEN ua.activity_type = 'rate' THEN 
            (SELECT JSON_OBJECT(
              'rating', r.rating,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url
            )
            FROM ratings r
            JOIN prompt_cards pc ON r.prompt_card_id = pc.id
            WHERE r.id = ua.reference_id)
          WHEN ua.activity_type = 'comment' THEN 
            (SELECT JSON_OBJECT(
              'comment_text', c.comment_text,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url
            )
            FROM comments c
            JOIN prompt_cards pc ON c.prompt_card_id = pc.id
            WHERE c.id = ua.reference_id)
          WHEN ua.activity_type = 'share' THEN 
            (SELECT JSON_OBJECT(
              'platform', s.platform,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url
            )
            FROM shares s
            JOIN prompt_cards pc ON s.prompt_card_id = pc.id
            WHERE s.id = ua.reference_id)
          WHEN ua.activity_type = 'follow' THEN 
            (SELECT JSON_OBJECT(
              'followed_id', f.followed_id,
              'username', u.username,
              'profile_image', u.profile_image
            )
            FROM followers f
            JOIN users u ON f.followed_id = u.id
            WHERE f.id = ua.reference_id)
          WHEN ua.activity_type = 'collect' THEN 
            (SELECT JSON_OBJECT(
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url,
              'type_name', pt.name,
              'category_name', c.name,
              'rarity_name', rl.name,
              'color_code', rl.color_code
            )
            FROM user_collections uc
            JOIN prompt_cards pc ON uc.prompt_card_id = pc.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE uc.id = ua.reference_id)
          ELSE NULL
        END as activity_data
      FROM user_activities ua
      WHERE ua.user_id = ?
      ORDER BY ua.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // 过滤掉不完整的活动（例如，相关记录已删除）
    const filteredActivities = activities.filter(activity => activity.activity_data !== null);

    // 获取总活动数以支持分页
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM user_activities WHERE user_id = ?',
      [userId]
    );

    const total = countResult[0].total;

    res.status(200).json({
      activities: filteredActivities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户活动失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取关注用户的活动流
exports.getFollowingActivityFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 获取当前用户关注的人的活动
    const [activities] = await pool.query(`
      SELECT 
        ua.id, ua.activity_type, ua.created_at,
        ua.reference_id,
        ua.user_id,
        u.username, u.profile_image,
        CASE 
          WHEN ua.activity_type = 'draw' THEN 
            (SELECT JSON_OBJECT(
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url,
              'type_name', pt.name,
              'category_name', c.name,
              'rarity_name', rl.name,
              'color_code', rl.color_code
            )
            FROM draw_history dh
            JOIN prompt_cards pc ON dh.prompt_card_id = pc.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE dh.id = ua.reference_id)
          WHEN ua.activity_type = 'rate' THEN 
            (SELECT JSON_OBJECT(
              'rating', r.rating,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url
            )
            FROM ratings r
            JOIN prompt_cards pc ON r.prompt_card_id = pc.id
            WHERE r.id = ua.reference_id)
          WHEN ua.activity_type = 'comment' THEN 
            (SELECT JSON_OBJECT(
              'comment_text', c.comment_text,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url
            )
            FROM comments c
            JOIN prompt_cards pc ON c.prompt_card_id = pc.id
            WHERE c.id = ua.reference_id)
          WHEN ua.activity_type = 'share' THEN 
            (SELECT JSON_OBJECT(
              'platform', s.platform,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url
            )
            FROM shares s
            JOIN prompt_cards pc ON s.prompt_card_id = pc.id
            WHERE s.id = ua.reference_id)
          WHEN ua.activity_type = 'follow' THEN 
            (SELECT JSON_OBJECT(
              'followed_id', f.followed_id,
              'username', followed_u.username,
              'profile_image', followed_u.profile_image
            )
            FROM followers f
            JOIN users followed_u ON f.followed_id = followed_u.id
            WHERE f.id = ua.reference_id)
          WHEN ua.activity_type = 'collect' THEN 
            (SELECT JSON_OBJECT(
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url,
              'type_name', pt.name,
              'category_name', c.name,
              'rarity_name', rl.name,
              'color_code', rl.color_code
            )
            FROM user_collections uc
            JOIN prompt_cards pc ON uc.prompt_card_id = pc.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE uc.id = ua.reference_id)
          ELSE NULL
        END as activity_data
      FROM user_activities ua
      JOIN users u ON ua.user_id = u.id
      JOIN followers f ON ua.user_id = f.followed_id
      WHERE f.follower_id = ?
      ORDER BY ua.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // 过滤掉不完整的活动（例如，相关记录已删除）
    const filteredActivities = activities.filter(activity => activity.activity_data !== null);

    // 获取总活动数以支持分页
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM user_activities ua
      JOIN followers f ON ua.user_id = f.followed_id
      WHERE f.follower_id = ?
    `, [userId]);

    const total = countResult[0].total;

    res.status(200).json({
      activities: filteredActivities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取关注用户活动失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取热门活动流
exports.getPopularActivityFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20, timeframe = 'week' } = req.query;
    const offset = (page - 1) * limit;

    // 根据时间范围确定日期过滤条件
    let dateFilter = '';
    switch (timeframe) {
      case 'day':
        dateFilter = 'AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
        break;
      case 'week':
        dateFilter = 'AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateFilter = 'AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      default:
        dateFilter = 'AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    // 获取受欢迎的活动（基于相关提示词的质量分数和近期活动）
    const [activities] = await pool.query(`
      SELECT 
        ua.id, ua.activity_type, ua.created_at,
        ua.reference_id,
        ua.user_id,
        u.username, u.profile_image,
        CASE 
          WHEN ua.activity_type = 'rate' THEN 
            (SELECT JSON_OBJECT(
              'rating', r.rating,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url,
              'quality_score', pc.quality_score
            )
            FROM ratings r
            JOIN prompt_cards pc ON r.prompt_card_id = pc.id
            WHERE r.id = ua.reference_id)
          WHEN ua.activity_type = 'comment' THEN 
            (SELECT JSON_OBJECT(
              'comment_text', c.comment_text,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url,
              'quality_score', pc.quality_score
            )
            FROM comments c
            JOIN prompt_cards pc ON c.prompt_card_id = pc.id
            WHERE c.id = ua.reference_id)
          WHEN ua.activity_type = 'share' THEN 
            (SELECT JSON_OBJECT(
              'platform', s.platform,
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url,
              'quality_score', pc.quality_score
            )
            FROM shares s
            JOIN prompt_cards pc ON s.prompt_card_id = pc.id
            WHERE s.id = ua.reference_id)
          WHEN ua.activity_type = 'collect' THEN 
            (SELECT JSON_OBJECT(
              'prompt_id', pc.id,
              'prompt_text', pc.prompt_text,
              'preview_url', pc.preview_url,
              'type_name', pt.name,
              'category_name', c.name,
              'rarity_name', rl.name,
              'color_code', rl.color_code,
              'quality_score', pc.quality_score
            )
            FROM user_collections uc
            JOIN prompt_cards pc ON uc.prompt_card_id = pc.id
            JOIN prompt_types pt ON pc.type_id = pt.id
            JOIN categories c ON pc.category_id = c.id
            JOIN rarity_levels rl ON pc.rarity_level_id = rl.id
            WHERE uc.id = ua.reference_id)
          ELSE NULL
        END as activity_data
      FROM user_activities ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.activity_type IN ('rate', 'comment', 'share', 'collect')
      ${dateFilter}
      ORDER BY 
        (CASE 
          WHEN ua.activity_type = 'rate' THEN 
            (SELECT pc.quality_score
             FROM ratings r
             JOIN prompt_cards pc ON r.prompt_card_id = pc.id
             WHERE r.id = ua.reference_id)
          WHEN ua.activity_type = 'comment' THEN 
            (SELECT pc.quality_score
             FROM comments c
             JOIN prompt_cards pc ON c.prompt_card_id = pc.id
             WHERE c.id = ua.reference_id)
          WHEN ua.activity_type = 'share' THEN 
            (SELECT pc.quality_score
             FROM shares s
             JOIN prompt_cards pc ON s.prompt_card_id = pc.id
             WHERE s.id = ua.reference_id)
          WHEN ua.activity_type = 'collect' THEN 
            (SELECT pc.quality_score
             FROM user_collections uc
             JOIN prompt_cards pc ON uc.prompt_card_id = pc.id
             WHERE uc.id = ua.reference_id)
          ELSE 0
        END) DESC,
        ua.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    // 过滤掉不完整的活动（例如，相关记录已删除）
    const filteredActivities = activities.filter(activity => activity.activity_data !== null);

    // 为了简单起见，不计算总数，直接返回过滤后的结果
    res.status(200).json({
      activities: filteredActivities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取热门活动失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户通知
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = 'WHERE n.user_id = ?';
    const queryParams = [userId];
    
    if (unread_only === 'true' || unread_only === true) {
      whereClause += ' AND n.is_read = FALSE';
    }

    // 获取用户通知
    const [notifications] = await pool.query(`
      SELECT n.id, n.notification_type, n.message, n.reference_id, n.is_read, n.created_at,
        sender.id as sender_id, sender.username as sender_username, sender.profile_image as sender_profile_image
      FROM notifications n
      LEFT JOIN users sender ON n.sender_id = sender.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    // 获取总通知数以支持分页
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM notifications n ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // 获取未读通知数量
    const [unreadCount] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.status(200).json({
      notifications,
      unread_count: unreadCount[0].count,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户通知失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 标记通知为已读
exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    // 验证通知是否存在且属于当前用户
    const [notifications] = await pool.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ message: '通知不存在或无权访问' });
    }

    // 标记通知为已读
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );

    res.status(200).json({ message: '通知已标记为已读' });
  } catch (error) {
    console.error('标记通知已读失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 标记所有通知为已读
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    // 更新所有未读通知
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.status(200).json({ message: '所有通知已标记为已读' });
  } catch (error) {
    console.error('标记所有通知已读失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除通知
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    // 验证通知是否存在且属于当前用户
    const [notifications] = await pool.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ message: '通知不存在或无权访问' });
    }

    // 删除通知
    await pool.query('DELETE FROM notifications WHERE id = ?', [notificationId]);

    res.status(200).json({ message: '通知已删除' });
  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};