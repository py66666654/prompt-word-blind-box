// 排行榜路由
const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 获取所有排行榜类型
router.get('/types', leaderboardController.getAllLeaderboardTypes);

// 获取特定排行榜数据
router.get('/:typeId', leaderboardController.getLeaderboard);

// 获取用户在所有排行榜中的排名
router.get('/users/:userId/rankings', leaderboardController.getUserRankings);

module.exports = router;