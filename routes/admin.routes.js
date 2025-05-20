// 管理员路由
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const fileUpload = require('express-fileupload');

// 所有管理员路由都需要认证和权限检查
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

// 使用文件上传中间件（用于CSV和JSON导入）
router.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB限制
}));

// 获取仪表盘数据
router.get('/dashboard', adminController.getDashboardData);

// 提示词管理
router.get('/prompts', adminController.getPrompts);
router.get('/prompts/:promptId', adminController.getPromptById);
router.post('/prompts', adminController.createPrompt);
router.put('/prompts/:promptId', adminController.updatePrompt);
router.delete('/prompts/:promptId', adminController.deletePrompt);
router.post('/prompts/bulk-delete', adminController.bulkDeletePrompts);

// AI提示词生成
router.post('/prompts/generate', adminController.generateAiPrompts);
router.post('/prompts/generate/preview', adminController.previewAiPrompt);

// 提示词导入导出
router.post('/prompts/import', adminController.importPrompts);
router.get('/prompts/export-template/:format', adminController.exportPromptTemplate);

module.exports = router;