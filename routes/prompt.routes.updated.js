// 提示词相关路由（更新版）
const express = require('express');
const router = express.Router();
const promptController = require('../controllers/prompt.controller.updated');
const aiPromptGenerator = require('../services/ai-prompt-generator');
const { middlewares: analyticsMiddleware } = require('./analytics.routes');

// 获取随机提示词卡片
router.get('/random', promptController.getRandomPrompt);

// 按类型获取随机提示词
router.get('/random/type/:typeId', promptController.getRandomPromptByType);

// 强制生成新的AI提示词（专门用于测试）
router.post('/generate/ai', async (req, res) => {
    try {
        const { type } = req.body;
        
        let result;
        if (type && typeof type === 'string') {
            // 生成指定类型的AI提示词
            result = await aiPromptGenerator.generatePromptByType(type);
        } else {
            // 生成随机类型的AI提示词
            result = await aiPromptGenerator.generateRandomPrompt();
        }
        
        res.status(201).json(result);
    } catch (error) {
        console.error('生成AI提示词失败:', error);
        res.status(500).json({ message: '生成AI提示词失败', error: error.message });
    }
});

// 根据类别获取提示词
router.get('/category/:categoryId', promptController.getPromptsByCategory);

// 获取所有类别
router.get('/categories', promptController.getAllCategories);

// 获取所有提示词类型
router.get('/types', promptController.getAllPromptTypes);

// 获取所有稀有度等级
router.get('/rarity-levels', promptController.getAllRarityLevels);

// 获取单个提示词详情
router.get('/:id', analyticsMiddleware.viewPrompt, promptController.getPromptById);

module.exports = router;