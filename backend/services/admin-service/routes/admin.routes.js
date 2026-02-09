const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Список пользователей
router.get('/users', adminController.getUsers);

// Блокировка/разблокировка пользователя
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);

// Смена роли
router.patch('/users/:id/role', adminController.changeRole);

module.exports = router;
