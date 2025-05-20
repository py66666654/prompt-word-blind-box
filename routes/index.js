// 路由主入口
const express = require('express');
const router = express.Router();

// 导入路由模块
const promptRoutes = require('./prompt.routes.updated');
const userRoutes = require('./user.routes');
const collectionRoutes = require('./collection.routes');
const commentRoutes = require('./comment.routes');
const ratingRoutes = require('./rating.routes');
const followRoutes = require('./follow.routes');
const notificationRoutes = require('./notification.routes');
const activityRoutes = require('./activity.routes');
const shareRoutes = require('./share.routes');
const challengeRoutes = require('./challenge.routes');
const achievementRoutes = require('./achievement.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const collaborativeRoutes = require('./collaborative.routes');
const moderationRoutes = require('./moderation.routes');
const reportRoutes = require('./report.routes');
const analyticsRoutes = require('./analytics.routes');
const broadcastRoutes = require('./broadcast.routes');
const adminRoutes = require('./admin.routes'); // 添加管理员路由

// 注册路由
router.use('/api/prompts', promptRoutes);
router.use('/api/users', userRoutes);
router.use('/api/collections', collectionRoutes);
router.use('/api/comments', commentRoutes);
router.use('/api/ratings', ratingRoutes);
router.use('/api/follows', followRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/activities', activityRoutes);
router.use('/api/shares', shareRoutes);
router.use('/api/challenges', challengeRoutes);
router.use('/api/achievements', achievementRoutes);
router.use('/api/leaderboards', leaderboardRoutes);
router.use('/api/collaborative', collaborativeRoutes);
router.use('/api/moderation', moderationRoutes);
router.use('/api/reports', reportRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/broadcasts', broadcastRoutes);
router.use('/api/admin', adminRoutes); // 添加管理员API路由

module.exports = router;