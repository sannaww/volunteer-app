const projectsService = require('../services/projects.service');

// helper: кто пришёл из Gateway
function getUserFromHeaders(req) {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  return {
    userId: userId ? parseInt(userId, 10) : null,
    role: role || null
  };
}

exports.getProjects = async (req, res) => {
  try {
    const projects = await projectsService.getAllProjects(req.query);
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка получения проектов' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await projectsService.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка получения проекта' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);

    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
    if (!['organizer', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // В дипломной логике: организатор создаёт черновик (модерация)
    const payload = {
      ...req.body,
      status: req.body.status || 'DRAFT',
      createdBy: userId
    };

    // если кто-то пытается сразу ACTIVE — запретим организатору (admin может)
    if (payload.status === 'ACTIVE' && role !== 'admin') {
      payload.status = 'DRAFT';
    }

    const created = await projectsService.createProject(payload);
    res.status(201).json(created);
  } catch (error) {
    console.error('createProject error:', error);
    res.status(500).json({ error: 'Ошибка создания проекта' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);

    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

    const id = parseInt(req.params.id, 10);
    const existing = await projectsService.getProjectById(id);
    if (!existing) return res.status(404).json({ error: 'Проект не найден' });

    // права: admin или создатель проекта
    if (role !== 'admin' && existing.createdBy !== userId) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // организатор не может сам ставить ACTIVE (это делает админ approve)
    const updateData = { ...req.body };
    if (role !== 'admin' && updateData.status === 'ACTIVE') {
      updateData.status = existing.status; // игнорируем попытку
    }

    const updated = await projectsService.updateProject(id, updateData);
    res.json(updated);
  } catch (error) {
    console.error('updateProject error:', error);
    res.status(500).json({ error: 'Ошибка обновления проекта' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);

    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

    const id = parseInt(req.params.id, 10);
    const existing = await projectsService.getProjectById(id);
    if (!existing) return res.status(404).json({ error: 'Проект не найден' });

    if (role !== 'admin' && existing.createdBy !== userId) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    await projectsService.deleteProject(id);
    res.json({ message: 'Проект удален' });
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({ error: 'Ошибка удаления проекта' });
  }
};
