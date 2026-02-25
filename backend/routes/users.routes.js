const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Получить мой профиль
router.get('/me', authMiddleware, usersController.getMyProfile);

// Обновить профиль
router.put('/me', authMiddleware, usersController.updateProfile);

module.exports = router;
