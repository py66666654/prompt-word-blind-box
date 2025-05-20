// 路由配置
const express = require('express');
const router = express.Router();

// 导入各路由模块
const promptRoutes = require('./prompt.routes.updated');
const userRoutes = require('./user.routes');
const collectionRoutes = require('./collection.routes');
const ratingRoutes = require('./rating.routes');
const commentRoutes = require('./comment.routes');
const shareRoutes = require('./share.routes');
const followRoutes = require('./follow.routes');
const activityRoutes = require('./activity.routes');
const achievementRoutes = require('./achievement.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const challengeRoutes = require('./challenge.routes');
const collaborativeRoutes = require('./collaborative.routes');
const notificationRoutes = require('./notification.routes');
const reportRoutes = require('./report.routes');
const moderationRoutes = require('./moderation.routes');
const broadcastRoutes = require('./broadcast.routes');
const { router: analyticsRoutes } = require('./analytics.routes');

// 设置API路由
router.use('/prompts', promptRoutes);
router.use('/users', userRoutes);
router.use('/collections', collectionRoutes);
router.use('/ratings', ratingRoutes);
router.use('/comments', commentRoutes);
router.use('/shares', shareRoutes);
router.use('/follows', followRoutes);
router.use('/activities', activityRoutes);
router.use('/achievements', achievementRoutes);
router.use('/leaderboards', leaderboardRoutes);
router.use('/challenges', challengeRoutes);
router.use('/collaborative', collaborativeRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/moderation', moderationRoutes);
router.use('/broadcasts', broadcastRoutes);
router.use('/analytics', analyticsRoutes);

// API健康检查
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API运行正常' });
});

module.exports = router;