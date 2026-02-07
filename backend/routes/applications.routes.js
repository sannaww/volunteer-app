const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applications.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Подать заявку
router.post('/:projectId', authMiddleware, applicationsController.createApplication);

// Получить заявки по проекту
router.get('/project/:projectId', authMiddleware, applicationsController.getProjectApplications);

// Получить мои заявки
router.get('/my', authMiddleware, applicationsController.getMyApplications);

module.exports = router;
