// 成就系统路由
const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievement.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 获取所有成就类型
router.get('/types', achievementController.getAllAchievementTypes);

// 获取成就类型详情
router.get('/types/:typeId', achievementController.getAchievementTypeDetails);

// 获取用户成就
router.get('/users/:userId', achievementController.getUserAchievements);

// 获取用户未解锁的成就（需要认证）
router.get('/locked', authMiddleware.verifyToken, achievementController.getLockedAchievements);

// 获取最近解锁的成就
router.get('/users/:userId/recent', achievementController.getRecentlyUnlockedAchievements);

module.exports = router;