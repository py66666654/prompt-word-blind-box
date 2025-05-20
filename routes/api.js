const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');

// 导入控制器
const userController = require('../controllers/user.controller');
const promptController = require('../controllers/prompt.controller');
const collectionController = require('../controllers/collection.controller');
const characterController = require('../controllers/character.controller');
const worldController = require('../controllers/world.controller');
const plotController = require('../controllers/plot.controller');
const achievementController = require('../controllers/achievement.controller');
const activityController = require('../controllers/activity.controller');

// 添加基础路由前缀
router.use('/users', require('./user.routes'));
router.use('/prompts', require('./prompt.routes'));
router.use('/collections', require('./collection.routes'));

/**
 * 认证相关路由
 */
// 用户注册
router.post('/auth/register', userController.register);
// 用户登录
router.post('/auth/login', userController.login);
// 验证邮箱
router.get('/auth/verify-email/:token', userController.verifyEmail);
// 重置密码请求
router.post('/auth/reset-password-request', userController.resetPasswordRequest);
// 重置密码
router.post('/auth/reset-password', userController.resetPassword);
// 刷新令牌
router.post('/auth/refresh-token', userController.refreshToken);
// 登出
router.post('/auth/logout', authMiddleware, userController.logout);

/**
 * 提示词抽取相关路由
 */
// 抽取提示词
router.post('/draws', authMiddleware, promptController.drawPrompt);
// 获取抽取历史
router.get('/draws/history', authMiddleware, promptController.getDrawHistory);
// 获取用户剩余抽取次数
router.get('/draws/remaining', authMiddleware, promptController.getRemainingDraws);
// 获取抽取统计数据
router.get('/draws/stats', authMiddleware, promptController.getDrawStats);
// 获取卡池信息
router.get('/draws/pools', promptController.getCardPools);
// 获取特定卡池信息
router.get('/draws/pools/:id', promptController.getCardPoolById);

/**
 * 创意卡片相关路由
 */
// 角色卡相关
router.get('/characters', characterController.getAllCharacterCards);
router.get('/characters/:id', characterController.getCharacterCardById);
router.post('/characters', authMiddleware, characterController.createCharacterCard);
router.put('/characters/:id', authMiddleware, characterController.updateCharacterCard);
router.delete('/characters/:id', authMiddleware, characterController.deleteCharacterCard);
router.get('/character-tags', characterController.getAllCharacterTags);

// 世界卡相关
router.get('/worlds', worldController.getAllWorldCards);
router.get('/worlds/:id', worldController.getWorldCardById);
router.post('/worlds', authMiddleware, worldController.createWorldCard);
router.put('/worlds/:id', authMiddleware, worldController.updateWorldCard);
router.delete('/worlds/:id', authMiddleware, worldController.deleteWorldCard);
router.get('/world-tags', worldController.getAllWorldTags);

// 剧情卡相关
router.get('/plots', plotController.getAllPlotCards);
router.get('/plots/:id', plotController.getPlotCardById);
router.post('/plots', authMiddleware, plotController.createPlotCard);
router.put('/plots/:id', authMiddleware, plotController.updatePlotCard);
router.delete('/plots/:id', authMiddleware, plotController.deletePlotCard);
router.get('/plot-tags', plotController.getAllPlotTags);

// 创意卡片组合
router.get('/combinations', authMiddleware, promptController.getUserCardCombinations);
router.get('/combinations/:id', promptController.getCardCombinationById);
router.post('/combinations', authMiddleware, promptController.createCardCombination);
router.put('/combinations/:id', authMiddleware, promptController.updateCardCombination);
router.delete('/combinations/:id', authMiddleware, promptController.deleteCardCombination);
router.get('/combinations/public', promptController.getPublicCardCombinations);

/**
 * 社区互动相关路由
 */
// 评论
router.post('/prompts/:id/comments', authMiddleware, promptController.addComment);
router.get('/prompts/:id/comments', promptController.getComments);
router.delete('/comments/:id', authMiddleware, promptController.deleteComment);

// 点赞
router.post('/prompts/:id/like', authMiddleware, promptController.likePrompt);
router.delete('/prompts/:id/like', authMiddleware, promptController.unlikePrompt);

// 分享
router.post('/prompts/:id/share', authMiddleware, promptController.sharePrompt);
router.get('/share/:shareId', promptController.getSharedPrompt);

/**
 * 成就相关路由
 */
// 获取所有成就
router.get('/achievements', achievementController.getAllAchievements);
// 获取用户成就
router.get('/achievements/user', authMiddleware, achievementController.getUserAchievements);
// 获取成就详情
router.get('/achievements/:id', achievementController.getAchievementById);
// 展示徽章设置
router.post('/achievements/badges/display', authMiddleware, achievementController.setBadgeDisplay);
// 获取用户展示的徽章
router.get('/users/:id/badges', achievementController.getUserBadges);

/**
 * 活动相关路由
 */
// 获取活动列表
router.get('/activities', activityController.getAllActivities);
// 获取活动详情
router.get('/activities/:id', activityController.getActivityById);
// 参与活动
router.post('/activities/:id/join', authMiddleware, activityController.joinActivity);
// 活动进度更新
router.put('/activities/:id/progress', authMiddleware, activityController.updateActivityProgress);
// 领取活动奖励
router.post('/activities/:id/claim-reward', authMiddleware, activityController.claimActivityReward);

/**
 * 管理员相关路由
 */
// 审核提示词
router.put('/admin/prompts/:id/review', authMiddleware, promptController.reviewPrompt);
// 管理用户
router.get('/admin/users', authMiddleware, userController.getAllUsers);
router.put('/admin/users/:id', authMiddleware, userController.updateUser);
// 系统统计
router.get('/admin/stats', authMiddleware, promptController.getSystemStats);
// 创建活动
router.post('/admin/activities', authMiddleware, activityController.createActivity);
router.put('/admin/activities/:id', authMiddleware, activityController.updateActivity);

module.exports = router;