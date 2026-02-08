const express = require('express');
const router = express.Router();

const projectsController = require('../controllers/projects.controller');

// Получить все проекты
router.get('/', projectsController.getProjects);

// Получить проект по ID
router.get('/:id', projectsController.getProject);

// Создать проект
router.post('/', projectsController.createProject);

module.exports = router;
