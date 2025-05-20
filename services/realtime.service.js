// 实时功能服务
const { pool } = require('../config/database');
const { sendNotification, createAndSendNotification } = require('./websocket.service');

// 实时活动流
async function broadcastActivity(userId, activityType, activityData) {
  try {
    // 获取用户的关注者
    const [followers] = await pool.query(`
      SELECT follower_id FROM followers WHERE followed_id = ?
    `, [userId]);
    
    // 获取用户信息
    const [users] = await pool.query(`
      SELECT username, profile_image FROM users WHERE id = ?
    `, [userId]);
    
    if (users.length === 0) {
      throw new Error('用户不存在');
    }
    
    const user = {
      id: userId,
      username: users[0].username,
      profile_image: users[0].profile_image
    };
    
    // 活动消息模板
    let message = '';
    switch (activityType) {
      case 'draw':
        message = `${user.username} 抽取了一张新的提示词卡片`;
        break;
      case 'rate':
        message = `${user.username} 评价了一个提示词`;
        break;
      case 'comment':
        message = `${user.username} 发表了新评论`;
        break;
      case 'share':
        message = `${user.username} 分享了一个提示词`;
        break;
      case 'follow':
        message = `${user.username} 关注了您`;
        break;
      case 'collect':
        message = `${user.username} 收藏了一个提示词`;
        break;
      case 'achievement':
        message = `${user.username} 解锁了一项新成就`;
        break;
      case 'challenge':
        message = `${user.username} 完成了一个挑战`;
        break;
      default:
        message = `${user.username} 有了新活动`;
    }
    
    // 广播活动到所有关注者
    const activityNotification = {
      type: 'activity',
      user,
      activity_type: activityType,
      data: activityData,
      message,
      timestamp: new Date()
    };
    
    for (const follower of followers) {
      // 发送实时通知（不存储到数据库）
      await sendNotification(follower.follower_id, activityNotification);
    }
    
    return true;
  } catch (error) {
    console.error('广播活动失败:', error);
    return false;
  }
}

// 协作提示词实时更新
async function notifyCollaborativeUpdate(collaborativeId, updateType, updateData) {
  try {
    // 获取所有参与者
    const [participants] = await pool.query(`
      SELECT cp.user_id, cp.role, u.username 
      FROM collaborative_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.collaborative_prompt_id = ?
    `, [collaborativeId]);
    
    if (participants.length === 0) {
      throw new Error('找不到协作参与者');
    }
    
    // 获取协作提示词信息
    const [prompts] = await pool.query(`
      SELECT title FROM collaborative_prompts WHERE id = ?
    `, [collaborativeId]);
    
    if (prompts.length === 0) {
      throw new Error('协作提示词不存在');
    }
    
    const promptTitle = prompts[0].title;
    
    // 更新类型消息
    let message = '';
    let notificationType = 'collaborative';
    
    switch (updateType) {
      case 'edit':
        message = `协作提示词"${promptTitle}"有了新的编辑`;
        break;
      case 'comment':
        message = `有人在协作提示词"${promptTitle}"上发表了评论`;
        break;
      case 'status':
        message = `协作提示词"${promptTitle}"的状态已更新为${updateData.status}`;
        break;
      case 'participant':
        message = `${updateData.username}加入了协作提示词"${promptTitle}"`;
        break;
      case 'complete':
        message = `协作提示词"${promptTitle}"已完成`;
        break;
      default:
        message = `协作提示词"${promptTitle}"有更新`;
    }
    
    // 向所有参与者发送通知
    for (const participant of participants) {
      // 排除触发更新的用户
      if (participant.user_id !== updateData.initiator_id) {
        await createAndSendNotification(
          participant.user_id,
          updateData.initiator_id,
          notificationType,
          collaborativeId,
          message
        );
      }
    }
    
    return true;
  } catch (error) {
    console.error('发送协作更新通知失败:', error);
    return false;
  }
}

// 实时审核通知
async function notifyContentModeration(contentType, contentId, moderationAction, moderatorId, userId) {
  try {
    // 获取内容详情
    let contentTable, contentField;
    
    switch (contentType) {
      case 'prompt':
        contentTable = 'prompt_cards';
        contentField = 'prompt_text';
        break;
      case 'comment':
        contentTable = 'comments';
        contentField = 'comment_text';
        break;
      case 'collaborative':
        contentTable = 'collaborative_prompts';
        contentField = 'title';
        break;
      default:
        throw new Error('无效的内容类型');
    }
    
    const [contents] = await pool.query(`
      SELECT ${contentField} as content FROM ${contentTable} WHERE id = ?
    `, [contentId]);
    
    if (contents.length === 0) {
      throw new Error('内容不存在');
    }
    
    const contentPreview = contents[0].content.substring(0, 30) + (contents[0].content.length > 30 ? '...' : '');
    
    // 审核操作消息
    let message = '';
    
    switch (moderationAction) {
      case 'approve':
        message = `您的${getContentTypeName(contentType)}"${contentPreview}"已被批准`;
        break;
      case 'reject':
        message = `您的${getContentTypeName(contentType)}"${contentPreview}"因违反社区规则已被移除`;
        break;
      case 'flag':
        message = `您的${getContentTypeName(contentType)}"${contentPreview}"已被标记，需要进一步审核`;
        break;
      default:
        message = `您的${getContentTypeName(contentType)}"${contentPreview}"状态已更新`;
    }
    
    // 发送通知给内容创建者
    await createAndSendNotification(
      userId,
      moderatorId,
      'moderation',
      contentId,
      message
    );
    
    return true;
  } catch (error) {
    console.error('发送审核通知失败:', error);
    return false;
  }
}

// 群组通知
async function sendGroupNotification(groupType, groupId, message, excludeUserId = null) {
  try {
    let userIdField, groupTable, whereClause;
    
    switch (groupType) {
      case 'collaborative':
        groupTable = 'collaborative_participants';
        userIdField = 'user_id';
        whereClause = 'collaborative_prompt_id = ?';
        break;
      case 'followers':
        groupTable = 'followers';
        userIdField = 'follower_id';
        whereClause = 'followed_id = ?';
        break;
      case 'challenge':
        groupTable = 'user_challenges';
        userIdField = 'user_id';
        whereClause = 'challenge_id = ?';
        break;
      default:
        throw new Error('无效的群组类型');
    }
    
    // 获取群组成员
    const [members] = await pool.query(`
      SELECT ${userIdField} FROM ${groupTable} WHERE ${whereClause}
    `, [groupId]);
    
    if (members.length === 0) {
      return false; // 没有成员，不发送通知
    }
    
    // 构建通知
    const notification = {
      type: 'group_notification',
      group_type: groupType,
      group_id: groupId,
      message,
      timestamp: new Date()
    };
    
    // 向所有成员发送通知
    for (const member of members) {
      const userId = member[userIdField];
      
      // 排除指定用户
      if (excludeUserId !== userId) {
        await sendNotification(userId, notification);
      }
    }
    
    return true;
  } catch (error) {
    console.error('发送群组通知失败:', error);
    return false;
  }
}

// 系统广播
async function broadcastSystemMessage(message, userFilter = null) {
  try {
    // 构建查询条件
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
    
    // 获取符合条件的用户
    const [users] = await pool.query(`
      SELECT id FROM users ${whereClause}
    `, queryParams);
    
    if (users.length === 0) {
      return false; // 没有符合条件的用户
    }
    
    // 系统通知
    const systemNotification = {
      type: 'system',
      message,
      timestamp: new Date()
    };
    
    // 发送给所有符合条件的用户
    for (const user of users) {
      await sendNotification(user.id, systemNotification);
      
      // 存储到数据库便于离线用户后续查看
      await createAndSendNotification(
        user.id,
        null, // 系统消息没有发送者
        'system',
        null, // 系统广播没有特定引用ID
        message
      );
    }
    
    return true;
  } catch (error) {
    console.error('广播系统消息失败:', error);
    return false;
  }
}

// 辅助函数：获取内容类型名称
function getContentTypeName(contentType) {
  switch (contentType) {
    case 'prompt':
      return '提示词';
    case 'comment':
      return '评论';
    case 'collaborative':
      return '协作提示词';
    default:
      return '内容';
  }
}

module.exports = {
  broadcastActivity,
  notifyCollaborativeUpdate,
  notifyContentModeration,
  sendGroupNotification,
  broadcastSystemMessage
};