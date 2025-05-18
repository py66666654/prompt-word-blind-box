// 路由配置
const express = require('express');
const router = express.Router();

// 导入各路由模块
const promptRoutes = require('./prompt.routes');
const userRoutes = require('./user.routes');
const collectionRoutes = require('./collection.routes');

// 设置API路由
router.use('/prompts', promptRoutes);
router.use('/users', userRoutes);
router.use('/collections', collectionRoutes);

// API健康检查
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API运行正常' });
});

module.exports = router;