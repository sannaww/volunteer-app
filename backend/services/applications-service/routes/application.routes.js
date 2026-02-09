const express = require('express');
const router = express.Router();

const applicationsController = require('../controllers/applications.controller');

// Подать заявку на проект
router.post('/:projectId', applicationsController.createApplication);

// Получить заявки по проекту
router.get('/project/:projectId', applicationsController.getProjectApplications);

// Получить мои заявки
router.get('/my', applicationsController.getMyApplications);

module.exports = router;
