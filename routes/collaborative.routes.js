// 协作提示词路由
const express = require('express');
const router = express.Router();
const collaborativeController = require('../controllers/collaborative.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 创建协作提示词（需要认证）
router.post('/', authMiddleware.verifyToken, collaborativeController.createCollaborativePrompt);

// 获取协作提示词详情
router.get('/:promptId', collaborativeController.getCollaborativePromptDetails);

// 提交编辑建议（需要认证）
router.post('/:promptId/edits', authMiddleware.verifyToken, collaborativeController.submitEdit);

// 审核编辑建议（需要认证）
router.put('/edits/:editId/review', authMiddleware.verifyToken, collaborativeController.reviewEdit);

// 邀请参与者（需要认证）
router.post('/:promptId/participants', authMiddleware.verifyToken, collaborativeController.inviteParticipant);

// 获取用户的协作提示词（需要认证）
router.get('/user/my', authMiddleware.verifyToken, collaborativeController.getUserCollaborativePrompts);

// 退出协作提示词（需要认证）
router.delete('/:promptId/leave', authMiddleware.verifyToken, collaborativeController.leaveCollaborativePrompt);

// 完成协作提示词（需要认证）
router.put('/:promptId/complete', authMiddleware.verifyToken, collaborativeController.completeCollaborativePrompt);

// 归档或删除协作提示词（需要认证）
router.post('/:promptId/action', authMiddleware.verifyToken, collaborativeController.archiveOrDeleteCollaborativePrompt);

// 获取公开的协作提示词
router.get('/', collaborativeController.getPublicCollaborativePrompts);

module.exports = router;