const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projects.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Получить все проекты
router.get('/', projectsController.getAllProjects);

// Получить проект по ID
router.get('/:id', projectsController.getProjectById);

// Создать проект
router.post('/', authMiddleware, projectsController.createProject);

module.exports = router;
