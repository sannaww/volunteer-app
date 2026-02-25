const express = require('express');
const router = express.Router();

const applicationsController = require('../controllers/applications.controller');

// ВАЖНО:
// Авторизацию и роль мы проверяем в Gateway, поэтому здесь authMiddleware нет.
// Но мы всё равно используем x-user-id и x-user-role, которые пробросил Gateway.

// Волонтер: подать заявку
router.post('/:projectId', applicationsController.createApplication);

// Волонтер: мои заявки
router.get('/my', applicationsController.getMyApplications);

// Организатор/админ: заявки по проекту
router.get('/project/:projectId', applicationsController.getProjectApplications);

// Волонтер: отменить свою заявку (только PENDING)
router.delete('/:id', applicationsController.cancelMyApplication);

// Организатор/админ: одобрить / отклонить
router.patch('/:id/approve', applicationsController.approveApplication);
router.patch('/:id/reject', applicationsController.rejectApplication);

module.exports = router;
