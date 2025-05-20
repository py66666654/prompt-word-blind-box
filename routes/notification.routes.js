// 通知路由
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 获取用户通知 - 需要认证
router.get('/', authMiddleware.verifyToken, notificationController.getUserNotifications);

// 标记单个通知为已读 - 需要认证
router.put('/:notificationId/read', authMiddleware.verifyToken, notificationController.markNotificationRead);

// 标记所有通知为已读 - 需要认证
router.put('/read-all', authMiddleware.verifyToken, notificationController.markAllNotificationsRead);

// 删除通知 - 需要认证
router.delete('/:notificationId', authMiddleware.verifyToken, notificationController.deleteNotification);

// 获取WebSocket连接状态和信息
router.get('/websocket-status', notificationController.getWebSocketStatus);

module.exports = router;