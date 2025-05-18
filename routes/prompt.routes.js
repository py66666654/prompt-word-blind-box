// 提示词相关路由
const express = require('express');
const router = express.Router();
const promptController = require('../controllers/prompt.controller');

// 获取随机提示词卡片
router.get('/random', promptController.getRandomPrompt);

// 根据类别获取提示词
router.get('/category/:categoryId', promptController.getPromptsByCategory);

// 获取所有类别
router.get('/categories', promptController.getAllCategories);

// 获取单个提示词详情
router.get('/:id', promptController.getPromptById);

module.exports = router;