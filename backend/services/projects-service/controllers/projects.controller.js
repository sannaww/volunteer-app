const projectsService = require('../services/projects.service');

// Получить все проекты
exports.getProjects = async (req, res) => {
  try {
    const projects = await projectsService.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    res.status(500).json({ error: 'Ошибка получения проектов' });
  }
};

// Получить проект по ID
exports.getProject = async (req, res) => {
  try {
    const project = await projectsService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    res.json(project);
  } catch (error) {
    console.error('Ошибка получения проекта:', error);
    res.status(500).json({ error: 'Ошибка получения проекта' });
  }
};

// Создать проект
exports.createProject = async (req, res) => {
  try {
    const userIdHeader = req.headers['x-user-id'];
    const userId = userIdHeader ? parseInt(userIdHeader, 10) : null;

    if (!userId) {
      return res.status(401).json({ error: 'Требуется авторизация (нет x-user-id)' });
    }

    const project = await projectsService.createProject(req.body, userId);
    res.status(201).json(project);
  } catch (error) {
    console.error('Ошибка создания проекта:', error);
    res.status(500).json({ error: 'Ошибка создания проекта' });
  }
};

