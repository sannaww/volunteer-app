const express = require('express');
const router = express.Router();

const projectsController = require('../controllers/projects.controller');

// Получить все проекты
router.get('/', projectsController.getProjects);

router.get("/organizer/calendar", projectsController.getOrganizerCalendar);

// Получить проект по ID
router.get('/:id', projectsController.getProject);

// Создать проект (организатор/admin) — проверку сделаем в controller по x-user-role
router.post('/', projectsController.createProject);

// Обновить проект (организатор-владелец или admin)
router.put('/:id', projectsController.updateProject);

// Удалить проект (организатор-владелец или admin)
router.delete('/:id', projectsController.deleteProject);

module.exports = router;
