// 活动相关路由
const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 获取用户活动流
router.get('/users/:userId', activityController.getUserActivityFeed);

// 获取关注用户的活动流（需要认证）
router.get('/following', authMiddleware.verifyToken, activityController.getFollowingActivityFeed);

// 获取热门活动流
router.get('/popular', activityController.getPopularActivityFeed);

// 获取用户通知（需要认证）
router.get('/notifications', authMiddleware.verifyToken, activityController.getUserNotifications);

// 标记通知为已读（需要认证）
router.put('/notifications/:notificationId/read', authMiddleware.verifyToken, activityController.markNotificationRead);

// 标记所有通知为已读（需要认证）
router.put('/notifications/read-all', authMiddleware.verifyToken, activityController.markAllNotificationsRead);

// 删除通知（需要认证）
router.delete('/notifications/:notificationId', authMiddleware.verifyToken, activityController.deleteNotification);

module.exports = router;