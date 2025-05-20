// 通知控制器
const { pool } = require('../config/database');
const { 
  sendUnreadNotificationsCount, 
  createAndSendNotification 
} = require('../services/websocket.service');

// 获取用户通知
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
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
    `, [...queryParams, parseInt(limit), offset]);
    
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
        pages: Math.ceil(total / parseInt(limit))
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
    
    // 更新WebSocket中的未读通知计数
    await sendUnreadNotificationsCount(userId);
    
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
    
    // 更新WebSocket中的未读通知计数（应该是0）
    await sendUnreadNotificationsCount(userId);
    
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
    
    // 更新WebSocket中的未读通知计数
    await sendUnreadNotificationsCount(userId);
    
    res.status(200).json({ message: '通知已删除' });
  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建新通知（供其他控制器调用）
exports.createNotification = async (userId, senderId, notificationType, referenceId, message) => {
  try {
    // 使用WebSocket服务创建并发送通知
    const notification = await createAndSendNotification(
      userId, senderId, notificationType, referenceId, message
    );
    
    return notification;
  } catch (error) {
    console.error('创建通知失败:', error);
    return null;
  }
};

// 获取WebSocket连接状态和信息
exports.getWebSocketStatus = async (req, res) => {
  try {
    const { getConnectedClients } = require('../services/websocket.service');
    
    res.status(200).json({
      is_running: true,
      connected_clients: getConnectedClients(),
      server_time: new Date()
    });
  } catch (error) {
    console.error('获取WebSocket状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

module.exports = exports;