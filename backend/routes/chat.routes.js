const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Отправить сообщение
router.post('/send', authMiddleware, chatController.sendMessage);

// Получить переписку
router.get('/conversation/:userId', authMiddleware, chatController.getConversation);

// Получить список диалогов
router.get('/conversations', authMiddleware, chatController.getConversations);

module.exports = router;
