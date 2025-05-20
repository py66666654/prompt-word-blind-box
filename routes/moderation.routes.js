// 内容审核路由
const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderation.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有路由都需要认证和权限检查
router.use(authMiddleware.verifyToken);

// 获取待审核内容
router.get('/content', moderationController.getPendingContent);

// 更新内容状态
router.put('/content/:contentType/:contentId', moderationController.updateContentStatus);

// 批量处理内容
router.post('/content/bulk', moderationController.bulkModerateContent);

// 获取用户审核相关信息
router.get('/users/:userId', moderationController.getUserModerationInfo);

// 添加用户处罚
router.post('/users/:userId/penalties', moderationController.addUserPenalty);

// 撤销用户处罚
router.put('/penalties/:penaltyId/revoke', moderationController.revokeUserPenalty);

// 获取内容审核规则
router.get('/filter-rules', moderationController.getContentFilterRules);

// 添加或更新内容审核规则
router.post('/filter-rules/:ruleId?', moderationController.updateContentFilterRule);

// 删除内容审核规则
router.delete('/filter-rules/:ruleId', moderationController.deleteContentFilterRule);

// 管理社区指南
router.post('/guidelines', moderationController.manageCommunityGuidelines);

module.exports = router;