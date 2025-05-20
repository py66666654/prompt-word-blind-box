// 挑战系统路由
const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 获取活跃的挑战
router.get('/active', challengeController.getActiveChallenges);

// 获取用户的挑战记录（需要认证）
router.get('/my', authMiddleware.verifyToken, challengeController.getUserChallenges);

// 获取挑战详情
router.get('/:challengeId', challengeController.getChallengeDetails);

// 创建新挑战（仅管理员）
router.post('/', authMiddleware.verifyToken, challengeController.createChallenge);

module.exports = router;