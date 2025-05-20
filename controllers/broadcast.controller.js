// 系统广播控制器
const { pool } = require('../config/database');
const { broadcastSystemMessage } = require('../services/realtime.service');
const { createNotification } = require('./notification.controller');

// 发送系统广播
exports.sendBroadcast = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { message, userFilter, saveToNotifications } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: '广播消息为必填项' });
    }
    
    // 验证过滤条件
    if (userFilter) {
      if (userFilter.role && !['user', 'moderator', 'admin', 'super_admin'].includes(userFilter.role)) {
        return res.status(400).json({ message: '无效的用户角色过滤条件' });
      }
      
      if (userFilter.premium !== undefined && typeof userFilter.premium !== 'boolean') {
        return res.status(400).json({ message: '无效的高级用户过滤条件' });
      }
    }
    
    // 构建查询条件以获取接收广播的用户数量
    let whereClause = '';
    const queryParams = [];
    
    if (userFilter) {
      if (userFilter.role) {
        whereClause += 'WHERE role = ?';
        queryParams.push(userFilter.role);
      }
      
      if (userFilter.premium !== undefined) {
        whereClause += whereClause ? ' AND premium = ?' : 'WHERE premium = ?';
        queryParams.push(userFilter.premium ? 1 : 0);
      }
    }
    
    // 获取符合条件的用户数量
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as count FROM users ${whereClause}
    `, queryParams);
    
    const recipientCount = countResult[0].count;
    
    if (recipientCount === 0) {
      return res.status(400).json({ message: '没有符合条件的接收用户' });
    }
    
    // 发送系统广播
    await broadcastSystemMessage(message, userFilter);
    
    // 如果需要保存到通知系统
    if (saveToNotifications) {
      // 获取所有符合条件的用户
      const [users] = await pool.query(`
        SELECT id FROM users ${whereClause}
      `, queryParams);
      
      // 为每个用户创建通知
      for (const user of users) {
        await createNotification(
          user.id,
          req.user.id,
          'system',
          null,
          message
        );
      }
    }
    
    // 记录广播历史
    const [result] = await pool.query(`
      INSERT INTO system_broadcasts (
        message, sender_id, recipient_filter, recipient_count
      ) VALUES (?, ?, ?, ?)
    `, [
      message, 
      req.user.id, 
      userFilter ? JSON.stringify(userFilter) : null,
      recipientCount
    ]);
    
    res.status(200).json({ 
      message: '系统广播已发送',
      broadcast_id: result.insertId,
      recipient_count: recipientCount
    });
  } catch (error) {
    console.error('发送系统广播失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取系统广播历史
exports.getBroadcastHistory = async (req, res) => {
  try {
    // 验证用户是否有管理员权限
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '没有权限访问此资源' });
    }
    
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
    // 获取广播历史
    const [broadcasts] = await pool.query(`
      SELECT 
        sb.id, sb.message, sb.recipient_filter, sb.recipient_count, sb.created_at,
        u.id as sender_id, u.username as sender_name
      FROM system_broadcasts sb
      JOIN users u ON sb.sender_id = u.id
      ORDER BY sb.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);
    
    // 获取总记录数
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM system_broadcasts');
    const total = countResult[0].total;
    
    // 解析接收者过滤条件
    for (const broadcast of broadcasts) {
      if (broadcast.recipient_filter) {
        try {
          broadcast.recipient_filter = JSON.parse(broadcast.recipient_filter);
        } catch (e) {
          broadcast.recipient_filter = null;
        }
      }
    }
    
    res.status(200).json({
      broadcasts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取系统广播历史失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

module.exports = exports;