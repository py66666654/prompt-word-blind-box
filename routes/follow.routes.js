// 关注功能路由
const express = require('express');
const router = express.Router();
const followController = require('../controllers/follow.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 关注用户（需要认证）
router.post('/users/:userId', authMiddleware.verifyToken, followController.followUser);

// 取消关注（需要认证）
router.delete('/users/:userId', authMiddleware.verifyToken, followController.unfollowUser);

// 获取用户的关注列表
router.get('/users/:userId/following', followController.getFollowing);

// 获取用户的粉丝列表
router.get('/users/:userId/followers', followController.getFollowers);

// 检查关注状态（需要认证）
router.get('/users/:userId/status', authMiddleware.verifyToken, followController.checkFollowStatus);

// 获取用户关注数据统计
router.get('/users/:userId/stats', followController.getFollowStats);

// 获取用户的共同关注
router.get('/users/:targetUserId/mutual', followController.getMutualFollows);

// 推荐关注的用户（需要认证）
router.get('/recommendations', authMiddleware.verifyToken, followController.getRecommendedUsers);

module.exports = router;