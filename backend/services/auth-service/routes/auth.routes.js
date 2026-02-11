const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getMe);
router.put('/profile', authController.updateProfile);
router.get('/users/:id', getUserById);

module.exports = router;
