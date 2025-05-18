// 收藏相关路由
const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collection.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 所有收藏相关的API都需要用户登录
router.use(authMiddleware.verifyToken);

// 获取用户收藏列表
router.get('/', collectionController.getUserCollections);

// 添加提示词到收藏
router.post('/:promptId', collectionController.addToCollection);

// 从收藏中移除提示词
router.delete('/:promptId', collectionController.removeFromCollection);

module.exports = router;