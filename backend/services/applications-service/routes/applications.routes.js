const express = require('express');
const router = express.Router();

const applicationsController = require('../controllers/applications.controller');

// Авторизацию проверяет gateway

router.post('/:projectId', applicationsController.createApplication);

router.get('/my', applicationsController.getMyApplications);

router.get('/project/:projectId', applicationsController.getProjectApplications);

router.delete('/:id', applicationsController.cancelMyApplication);

router.patch('/:id/approve', applicationsController.approveApplication);
router.patch('/:id/reject', applicationsController.rejectApplication);

module.exports = router;
