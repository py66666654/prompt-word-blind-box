// WebSocket服务
const WebSocket = require('ws');
const { pool } = require('../config/database');
const wsMiddleware = require('../middlewares/websocket.middleware');

// 存储连接的客户端
const clients = new Map();
// 存储频道订阅
const channels = new Map();

// 初始化WebSocket服务器
function initWebsocketServer(server) {
  const wss = new WebSocket.Server({ server });
  
  // 应用中间件
  const heartbeat = wsMiddleware.createHeartbeatMiddleware(wss);
  
  // 应用中间件
  wss.on('connection', async (ws, req) => {
    console.log('WebSocket连接建立中...');
    
    try {
      // 应用连接限制中间件
      await wsMiddleware.connectionLimiter(req, ws, async () => {
        // 应用令牌验证中间件
        await wsMiddleware.verifySocketToken(req, ws, async () => {
          // 应用心跳检测中间件
          heartbeat(ws, req, async () => {
            console.log(`用户 ${ws.userId} 的WebSocket连接已建立`);
            
            // 如果用户已有连接，管理多连接（不再强制关闭旧连接）
            if (!clients.has(ws.userId)) {
              clients.set(ws.userId, new Set());
            }
            
            clients.get(ws.userId).add(ws);
            
            // 更新用户在线状态
            await pool.query(
              'UPDATE user_online_status SET is_online = TRUE, last_seen = NOW() WHERE user_id = ?',
              [ws.userId]
            );
      
      // 发送欢迎消息
            ws.send(JSON.stringify({
              type: 'connection',
              message: '实时通知连接已建立',
              user_id: ws.userId,
              session_id: ws.sessionId,
              timestamp: new Date()
            }));
            
            // 发送未读通知数量
            sendUnreadNotificationsCount(ws.userId);
            
            // 监听关闭事件
            ws.on('close', async () => {
              console.log(`用户${ws.userId}的WebSocket连接已关闭`);
              
              // 移除客户端连接
              if (clients.has(ws.userId)) {
                const userClients = clients.get(ws.userId);
                userClients.delete(ws);
                
                // 如果用户没有剩余连接，删除用户条目
                if (userClients.size === 0) {
                  clients.delete(ws.userId);
                  
                  // 更新用户离线状态
                  await pool.query(
                    'UPDATE user_online_status SET is_online = FALSE, last_seen = NOW() WHERE user_id = ?',
                    [ws.userId]
                  );
                }
              }
              
              // 清理频道订阅
              for (const [channelName, subscribers] of channels.entries()) {
                if (subscribers.has(ws)) {
                  subscribers.delete(ws);
                  
                  // 如果频道没有订阅者，删除频道
                  if (subscribers.size === 0) {
                    channels.delete(channelName);
                  }
                }
              }
            });
            
            // 监听错误事件
            ws.on('error', (error) => {
              console.error(`WebSocket错误:`, error);
            });
            
            // 监听消息事件
            ws.on('message', async (message) => {
              try {
                const data = JSON.parse(message);
                
                // 处理确认通知已读
                if (data.type === 'mark_read' && data.notification_id) {
                  await markNotificationRead(ws.userId, data.notification_id);
                }
                
                // 处理确认所有通知已读
                if (data.type === 'mark_all_read') {
                  await markAllNotificationsRead(ws.userId);
                }
                
                // 处理频道订阅
                if (data.type === 'subscribe' && data.channel) {
                  subscribeToChannel(ws, data.channel);
                }
                
                // 处理取消频道订阅
                if (data.type === 'unsubscribe' && data.channel) {
                  unsubscribeFromChannel(ws, data.channel);
                }
                
                // 处理心跳消息
                if (data.type === 'heartbeat') {
                  ws.send(JSON.stringify({
                    type: 'heartbeat_ack',
                    timestamp: new Date()
                  }));
                  
                  // 更新用户最后活跃时间
                  await pool.query(
                    'UPDATE user_online_status SET last_seen = NOW() WHERE user_id = ?',
                    [ws.userId]
                  );
                }
              } catch (error) {
                console.error('处理WebSocket消息时出错:', error);
              }
            });
          });
        });
      });
    } catch (error) {
      console.error('WebSocket连接处理失败:', error);
      ws.close(4500, '服务器错误');
    }
  });
  
  return wss;
}

// 向特定用户发送通知
async function sendNotification(userId, notification) {
  try {
    // 记录通知发送记录
    const notificationData = {
      type: 'notification',
      data: notification,
      timestamp: new Date()
    };
    
    // 检查用户是否有活跃连接
    if (clients.has(userId)) {
      const userClients = clients.get(userId);
      let deliveredCount = 0;
      
      // 向用户的所有连接发送通知
      for (const client of userClients) {
        // 确保WebSocket连接是开放的
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(notificationData));
          deliveredCount++;
        }
      }
      
      // 更新通知发送统计
      if (deliveredCount > 0) {
        // 如果通知包含type字段，更新发送统计
        if (notification.notification_type) {
          updateNotificationStats(notification.notification_type, deliveredCount);
        }
        
        // 如果通知有ID，更新通知传递状态
        if (notification.id) {
          await pool.query(`
            UPDATE notifications 
            SET delivery_status = 'delivered', delivered_at = NOW(), is_realtime = TRUE
            WHERE id = ?
          `, [notification.id]);
        }
      }
    } else {
      // 如果通知有ID，更新通知传递状态为待处理
      if (notification.id) {
        await pool.query(`
          UPDATE notifications 
          SET delivery_status = 'pending'
          WHERE id = ?
        `, [notification.id]);
      }
    }
    
    return true;
  } catch (error) {
    console.error('发送通知失败:', error);
    
    // 如果通知有ID，更新通知传递状态为失败
    if (notification && notification.id) {
      try {
        await pool.query(`
          UPDATE notifications 
          SET delivery_status = 'failed'
          WHERE id = ?
        `, [notification.id]);
      } catch (e) {
        console.error('更新通知状态失败:', e);
      }
    }
    
    return false;
  }
}

// 更新通知发送统计
async function updateNotificationStats(notificationType, deliveredCount) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
    
    // 更新或插入统计记录
    await pool.query(`
      INSERT INTO realtime_notification_stats 
        (notification_type, count_sent, count_delivered, date)
      VALUES (?, 1, ?, ?)
      ON DUPLICATE KEY UPDATE
        count_sent = count_sent + 1,
        count_delivered = count_delivered + ?
    `, [notificationType, deliveredCount, today, deliveredCount]);
    
    return true;
  } catch (error) {
    console.error('更新通知统计失败:', error);
    return false;
  }
}

// 向用户发送未读通知数量
async function sendUnreadNotificationsCount(userId) {
  try {
    // 获取未读通知数量
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    
    const unreadCount = result[0].count;
    
    // 检查用户是否在线
    if (clients.has(userId)) {
      const client = clients.get(userId);
      
      // 确保WebSocket连接是开放的
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'unread_count',
          count: unreadCount,
          timestamp: new Date()
        }));
      }
    }
    
    return unreadCount;
  } catch (error) {
    console.error('发送未读通知数量失败:', error);
    return -1;
  }
}

// 标记单个通知为已读
async function markNotificationRead(userId, notificationId) {
  try {
    // 标记通知为已读
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    // 发送更新后的未读通知数量
    await sendUnreadNotificationsCount(userId);
    
    return true;
  } catch (error) {
    console.error('标记通知已读失败:', error);
    return false;
  }
}

// 标记所有通知为已读
async function markAllNotificationsRead(userId) {
  try {
    // 标记所有通知为已读
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    
    // 发送更新后的未读通知数量（应该是0）
    await sendUnreadNotificationsCount(userId);
    
    return true;
  } catch (error) {
    console.error('标记所有通知已读失败:', error);
    return false;
  }
}

// 创建新通知并实时推送
async function createAndSendNotification(userId, senderId, notificationType, referenceId, message) {
  try {
    // 先保存到数据库
    const [result] = await pool.query(`
      INSERT INTO notifications (
        user_id, sender_id, notification_type, reference_id, message
      ) VALUES (?, ?, ?, ?, ?)
    `, [userId, senderId, notificationType, referenceId, message]);
    
    const notificationId = result.insertId;
    
    // 获取发送者信息（如果有）
    let senderInfo = null;
    if (senderId) {
      const [senders] = await pool.query(
        'SELECT username, profile_image FROM users WHERE id = ?',
        [senderId]
      );
      
      if (senders.length > 0) {
        senderInfo = {
          id: senderId,
          username: senders[0].username,
          profile_image: senders[0].profile_image
        };
      }
    }
    
    // 构建完整通知对象
    const notification = {
      id: notificationId,
      user_id: userId,
      sender: senderInfo,
      notification_type: notificationType,
      reference_id: referenceId,
      message,
      is_read: false,
      created_at: new Date()
    };
    
    // 实时发送通知
    await sendNotification(userId, notification);
    
    // 更新未读通知数量
    await sendUnreadNotificationsCount(userId);
    
    return notification;
  } catch (error) {
    console.error('创建并发送通知失败:', error);
    return null;
  }
}

// 订阅频道
function subscribeToChannel(ws, channelName) {
  // 验证频道名称格式
  if (!validateChannelName(channelName, ws)) {
    ws.send(JSON.stringify({
      type: 'subscribe_error',
      channel: channelName,
      message: '无效的频道名称',
      timestamp: new Date()
    }));
    return false;
  }
  
  // 创建频道（如果不存在）
  if (!channels.has(channelName)) {
    channels.set(channelName, new Set());
  }
  
  // 添加订阅者
  channels.get(channelName).add(ws);
  
  // 确认订阅成功
  ws.send(JSON.stringify({
    type: 'subscribe_success',
    channel: channelName,
    timestamp: new Date()
  }));
  
  return true;
}

// 取消订阅频道
function unsubscribeFromChannel(ws, channelName) {
  // 检查频道是否存在
  if (!channels.has(channelName)) {
    ws.send(JSON.stringify({
      type: 'unsubscribe_error',
      channel: channelName,
      message: '频道不存在',
      timestamp: new Date()
    }));
    return false;
  }
  
  // 移除订阅者
  const subscribers = channels.get(channelName);
  subscribers.delete(ws);
  
  // 如果频道没有订阅者，删除频道
  if (subscribers.size === 0) {
    channels.delete(channelName);
  }
  
  // 确认取消订阅成功
  ws.send(JSON.stringify({
    type: 'unsubscribe_success',
    channel: channelName,
    timestamp: new Date()
  }));
  
  return true;
}

// 向频道发送消息
async function sendToChannel(channelName, message, sender = null) {
  try {
    // 检查频道是否存在
    if (!channels.has(channelName)) {
      return false;
    }
    
    const subscribers = channels.get(channelName);
    let deliveredCount = 0;
    
    // 构建消息数据
    const messageData = {
      type: 'channel_message',
      channel: channelName,
      data: message,
      sender: sender,
      timestamp: new Date()
    };
    
    // 向所有订阅者发送消息
    for (const subscriber of subscribers) {
      // 跳过发送者（如果有）
      if (sender && subscriber.userId === sender.id) {
        continue;
      }
      
      // 确保WebSocket连接是开放的
      if (subscriber.readyState === WebSocket.OPEN) {
        subscriber.send(JSON.stringify(messageData));
        deliveredCount++;
      }
    }
    
    // 记录频道消息发送统计
    if (channelName.startsWith('collaborative:')) {
      const collaborativeId = channelName.split(':')[1];
      if (collaborativeId) {
        await pool.query(`
          INSERT INTO collaborative_edit_history (
            collaborative_prompt_id, user_id, edit_type, content_before, content_after
          ) VALUES (?, ?, 'update', ?, ?)
        `, [
          collaborativeId,
          sender ? sender.id : null,
          null,
          JSON.stringify(message)
        ]);
      }
    }
    
    return deliveredCount;
  } catch (error) {
    console.error('向频道发送消息失败:', error);
    return 0;
  }
}

// 验证频道名称格式
function validateChannelName(channelName, ws) {
  // 公共频道（所有人都可以订阅）
  if (channelName.startsWith('public:')) {
    return true;
  }
  
  // 协作提示词频道
  if (channelName.startsWith('collaborative:')) {
    const collaborativeId = channelName.split(':')[1];
    if (!collaborativeId) return false;
    
    // 协作频道验证（实际应用中应检查用户是否是协作参与者）
    return true;
  }
  
  // 私有用户频道（只有自己可以订阅）
  if (channelName.startsWith('user:')) {
    const userId = channelName.split(':')[1];
    if (!userId) return false;
    
    // 只有自己可以订阅自己的私有频道
    return userId === ws.userId.toString();
  }
  
  // 群组频道
  if (channelName.startsWith('group:')) {
    const groupId = channelName.split(':')[1];
    if (!groupId) return false;
    
    // 群组频道验证（实际应用中应检查用户是否是群组成员）
    return true;
  }
  
  // 管理员频道
  if (channelName.startsWith('admin:')) {
    // 只有管理员可以订阅管理员频道
    return ['moderator', 'admin', 'super_admin'].includes(ws.userRole);
  }
  
  // 默认情况下不允许订阅
  return false;
}

// 获取在线用户数量
function getOnlineUsersCount() {
  return clients.size;
}

// 获取频道统计信息
function getChannelsStats() {
  const stats = {
    total_channels: channels.size,
    total_subscribers: 0,
    channels: {}
  };
  
  for (const [channelName, subscribers] of channels.entries()) {
    stats.total_subscribers += subscribers.size;
    stats.channels[channelName] = subscribers.size;
  }
  
  return stats;
}

module.exports = {
  initWebsocketServer,
  sendNotification,
  sendUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
  createAndSendNotification,
  subscribeToChannel,
  unsubscribeFromChannel,
  sendToChannel,
  getOnlineUsersCount,
  getChannelsStats,
  getConnectedClients: () => {
    let count = 0;
    for (const userClients of clients.values()) {
      count += userClients.size;
    }
    return count;
  },
  getUniqueConnectedUsers: () => clients.size
};