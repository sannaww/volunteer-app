const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

router.get('/users', adminController.getUsers);
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);
router.patch('/users/:id/role', adminController.changeRole);

router.get('/projects/pending', adminController.getPendingProjects);
router.patch('/projects/:id/approve', adminController.approveProject);
router.patch('/projects/:id/reject', adminController.rejectProject);

router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:id', adminController.deleteReviewById);

// Отчёты / аналитика
router.get('/reports/summary', adminController.getReportsSummary);
router.get('/reports/user-growth', adminController.getUserGrowthReport);
router.get('/reports/project-categories', adminController.getProjectCategoriesReport);
router.get('/reports/project-statuses', adminController.getProjectStatusesReport);

module.exports = router;