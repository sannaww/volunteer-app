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

function parseDateOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function validateDatesPayload(data) {
  // если дат нет — ок
  if (data.startDate === undefined && data.endDate === undefined) return;

  const start = parseDateOrNull(data.startDate);
  const end = parseDateOrNull(data.endDate);

  // если один есть, другой нет — ошибка
  if ((start && !end) || (!start && end)) {
    throw new Error("Нужно указать обе даты: startDate и endDate");
  }

  // если обе пустые/не переданы — ок
  if (!start && !end) return;

  if (start > end) {
    throw new Error("startDate не может быть позже endDate");
  }
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
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Некорректный id проекта" });
    }

    const project = await projectsService.getProjectById(id);
    if (!project) return res.status(404).json({ error: "Проект не найден" });

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка получения проекта" });
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

    try {
      validateDatesPayload(payload);
    } catch (e) {
      return res.status(400).json({ error: e.message });
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
    
    try {
      validateDatesPayload(updateData);
    } catch (e) {
      return res.status(400).json({ error: e.message });
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

// Календарь мероприятий организатора
// GET /organizer/calendar?month=YYYY-MM
exports.getOrganizerCalendar = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);

    if (!userId) return res.status(401).json({ error: "Требуется авторизация" });
    if (!["organizer", "admin"].includes(role)) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const month = req.query.month; // "2026-02"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "Параметр month должен быть в формате YYYY-MM" });
    }

    const [year, mon] = month.split("-").map(Number);

    // Границы месяца (локально, без UTC — для UI так проще)
    const start = new Date(year, mon - 1, 1, 0, 0, 0);
    const end = new Date(year, mon, 1, 0, 0, 0); // 1-е число следующего месяца

    // Берём проекты организатора, которые пересекают месяц
    // startDate < end && endDate >= start
    const projects = await projectsService.getOrganizerProjectsForCalendar({
      organizerId: userId,
      start,
      end,
    });

    return res.json({
      month,
      range: { start, end },
      projects,
    });
  } catch (error) {
    console.error("getOrganizerCalendar error:", error);
    res.status(500).json({ error: "Ошибка получения календаря",
    details: error.message, });
  }
};

// GET /organizer?status=ALL&includeDrafts=true&search=...
exports.getOrganizerProjects = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);

    if (!userId) return res.status(401).json({ error: "Требуется авторизация" });
    if (!["organizer", "admin"].includes(role)) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const status = (req.query.status || "ALL").toString().toUpperCase();
    const includeDrafts = String(req.query.includeDrafts || "true") === "true";
    const search = (req.query.search || "").toString();

    const projects = await projectsService.getOrganizerProjects({
      organizerId: userId,
      status,
      includeDrafts,
      search,
    });

    return res.json(projects);
  } catch (error) {
    console.error("getOrganizerProjects error:", error);
    res.status(500).json({ error: "Ошибка получения проектов организатора", details: error.message });
  }
};
