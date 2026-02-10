const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        // если такого поля нет — уберёшь
        isBlocked: true,
        createdAt: true
      },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked: true },
      select: { id: true, email: true, role: true, isBlocked: true }
    });

    res.json({ message: 'Пользователь заблокирован', user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка блокировки' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked: false },
      select: { id: true, email: true, role: true, isBlocked: true }
    });

    res.json({ message: 'Пользователь разблокирован', user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка разблокировки' });
  }
};

exports.changeRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;

    const allowed = ['volunteer', 'organizer', 'admin'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true }
    });

    res.json({ message: 'Роль изменена', user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка изменения роли' });
  }
};

// Получить проекты на модерации (DRAFT)
exports.getPendingProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: 'DRAFT' },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Admin getPendingProjects error:', error);
    res.status(500).json({ error: 'Ошибка получения проектов на модерации' });
  }
};

// Одобрить проект -> ACTIVE
exports.approveProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const project = await prisma.project.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    res.json({ message: 'Проект одобрен', project });
  } catch (error) {
    console.error('Admin approveProject error:', error);
    res.status(500).json({ error: 'Ошибка одобрения проекта' });
  }
};

// Отклонить проект -> CANCELLED (или оставить DRAFT)
exports.rejectProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const project = await prisma.project.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Проект отклонен', project });
  } catch (error) {
    console.error('Admin rejectProject error:', error);
    res.status(500).json({ error: 'Ошибка отклонения проекта' });
  }
};

