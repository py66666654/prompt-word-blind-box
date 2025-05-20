// 评论相关路由
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 添加评论（需要认证）
router.post('/prompts/:promptId', authMiddleware.verifyToken, commentController.addComment);

// 获取提示词的评论
router.get('/prompts/:promptId', commentController.getPromptComments);

// 获取评论的回复
router.get('/:commentId/replies', commentController.getCommentReplies);

// 更新评论（需要认证）
router.put('/:commentId', authMiddleware.verifyToken, commentController.updateComment);

// 删除评论（需要认证）
router.delete('/:commentId', authMiddleware.verifyToken, commentController.deleteComment);

// 获取用户的所有评论
router.get('/users/:userId', commentController.getUserComments);

module.exports = router;