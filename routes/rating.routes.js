// 评分相关路由
const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/rating.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 创建或更新评分（需要认证）
router.post('/prompts/:promptId', authMiddleware.verifyToken, ratingController.ratePrompt);

// 获取提示词的评分
router.get('/prompts/:promptId', ratingController.getPromptRatings);

// 获取用户对提示词的评分（需要认证）
router.get('/my/prompts/:promptId', authMiddleware.verifyToken, ratingController.getUserRating);

// 删除评分（需要认证）
router.delete('/prompts/:promptId', authMiddleware.verifyToken, ratingController.deleteRating);

// 获取用户的所有评分
router.get('/users/:userId', ratingController.getUserRatings);

module.exports = router;