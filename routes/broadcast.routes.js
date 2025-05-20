// 系统广播路由
const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/broadcast.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有路由需要认证
router.use(authMiddleware.verifyToken);

// 发送系统广播
router.post('/', broadcastController.sendBroadcast);

// 获取系统广播历史
router.get('/history', broadcastController.getBroadcastHistory);

module.exports = router;