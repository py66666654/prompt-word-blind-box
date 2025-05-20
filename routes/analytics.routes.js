// 分析路由
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const analyticsService = require('../services/analytics.service');

// 所有路由都需要用户认证
router.use(authMiddleware.verifyToken);

// 用户事件记录
router.post('/events', analyticsController.recordEvent);

// 更新会话时长
router.post('/sessions/duration', analyticsController.updateSessionDuration);

// 获取用户统计
router.get('/users/:userId', analyticsController.getUserStats);

// 获取内容统计
router.get('/content/:contentType/:contentId', analyticsController.getContentStats);

// 获取平台统计（管理员专用）
router.get('/platform', analyticsController.getPlatformStats);

// 自定义报告
router.get('/reports', analyticsController.getCustomReports);
router.get('/reports/:reportId', analyticsController.getCustomReportById);
router.post('/reports', analyticsController.saveCustomReport);
router.post('/reports/:reportId/run', analyticsController.runCustomReport);
router.delete('/reports/:reportId', analyticsController.deleteCustomReport);

// 用户分段
router.get('/segments', analyticsController.getUserSegments);
router.post('/segments', analyticsController.saveUserSegment);
router.post('/segments/:segmentId/users', analyticsController.addUserToSegment);
router.delete('/segments/:segmentId/users/:userId', analyticsController.removeUserFromSegment);

// 创建事件记录中间件
const viewPromptMiddleware = analyticsService.createUserEventMiddleware('view_prompt');
const drawPromptMiddleware = analyticsService.createUserEventMiddleware('draw_prompt');
const ratePromptMiddleware = analyticsService.createUserEventMiddleware('rate_prompt');

// 导出路由和中间件
module.exports = {
  router,
  middlewares: {
    viewPrompt: viewPromptMiddleware,
    drawPrompt: drawPromptMiddleware,
    ratePrompt: ratePromptMiddleware
  }
};