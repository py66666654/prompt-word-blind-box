// 举报系统路由
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 创建新举报 - 需要认证
router.post('/', authMiddleware.verifyToken, reportController.createReport);

// 获取举报类型列表 - 所有用户可访问
router.get('/types', reportController.getReportTypes);

// 获取社区指南 - 所有用户可访问
router.get('/guidelines', reportController.getCommunityGuidelines);

// 以下路由需要管理员权限
// 获取举报列表
router.get('/', authMiddleware.verifyToken, reportController.getReports);

// 获取单个举报详情
router.get('/:reportId', authMiddleware.verifyToken, reportController.getReportById);

// 更新举报状态
router.put('/:reportId/status', authMiddleware.verifyToken, reportController.updateReportStatus);

// 执行内容审核操作
router.post('/:contentType/:contentId/moderate', authMiddleware.verifyToken, reportController.moderateContent);

// 获取内容审核统计信息
router.get('/stats', authMiddleware.verifyToken, reportController.getModerationStats);

module.exports = router;