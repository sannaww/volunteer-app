const applicationsService = require('../services/applications.service');

function getUserFromHeaders(req) {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  return {
    userId: userId ? parseInt(userId, 10) : null,
    role: role || null,
  };
}

exports.createApplication = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);
    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
    if (role !== 'volunteer') return res.status(403).json({ error: 'Недостаточно прав' });

    const projectId = parseInt(req.params.projectId, 10);
    const { message } = req.body;

    const app = await applicationsService.createApplication({ userId, projectId, message });
    res.status(201).json(app);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Ошибка подачи заявки' });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const { userId } = getUserFromHeaders(req);
    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

    const apps = await applicationsService.getMyApplications(userId);
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при загрузке моих заявок' });
  }
};

exports.getProjectApplications = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);
    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
    if (role !== 'organizer' && role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' });

    const projectId = parseInt(req.params.projectId, 10);

    const apps = await applicationsService.getProjectApplications({ projectId, requesterId: userId, requesterRole: role });
    res.json(apps);
  } catch (e) {
    res.status(403).json({ error: e.message || 'Нет доступа' });
  }
};

exports.cancelMyApplication = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);
    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
    if (role !== 'volunteer') return res.status(403).json({ error: 'Недостаточно прав' });

    const id = parseInt(req.params.id, 10);
    const result = await applicationsService.cancelMyApplication({ applicationId: id, userId });

    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Ошибка отмены заявки' });
  }
};

exports.approveApplication = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);
    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
    if (role !== 'organizer' && role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' });

    const id = parseInt(req.params.id, 10);
    const updated = await applicationsService.updateStatus({
      applicationId: id,
      newStatus: 'APPROVED',
      requesterId: userId,
      requesterRole: role,
    });

    res.json(updated);
  } catch (e) {
    res.status(403).json({ error: e.message || 'Ошибка одобрения заявки' });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const { userId, role } = getUserFromHeaders(req);
    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
    if (role !== 'organizer' && role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' });

    const id = parseInt(req.params.id, 10);
    const updated = await applicationsService.updateStatus({
      applicationId: id,
      newStatus: 'REJECTED',
      requesterId: userId,
      requesterRole: role,
    });

    res.json(updated);
  } catch (e) {
    res.status(403).json({ error: e.message || 'Ошибка отклонения заявки' });
  }
};
