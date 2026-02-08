const express = require('express');
const router = express.Router();

const projectsController = require('../controllers/projects.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Получить все проекты
router.get('/', projectsController.getProjects);

// Получить проект по ID
router.get('/:id', projectsController.getProject);

// Создать проект (только авторизованный пользователь)
router.post('/', authMiddleware, projectsController.createProject);

module.exports = router;
