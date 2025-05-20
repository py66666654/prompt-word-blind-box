// 分享相关路由
const express = require('express');
const router = express.Router();
const shareController = require('../controllers/share.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 创建分享记录（需要认证）
router.post('/prompts/:promptId', authMiddleware.verifyToken, shareController.sharePrompt);

// 获取提示词的分享记录
router.get('/prompts/:promptId', shareController.getPromptShares);

// 获取用户的分享记录
router.get('/users/:userId', shareController.getUserShares);

// 获取分享统计
router.get('/stats', shareController.getShareStats);

module.exports = router;