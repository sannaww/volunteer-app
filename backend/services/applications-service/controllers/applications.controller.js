const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 📨 Подать заявку на проект
exports.createApplication = async (req, res) => {
  try {
    const userIdHeader = req.headers['x-user-id'];
    const userId = userIdHeader ? parseInt(userIdHeader, 10) : null;

    if (!userId) {
      return res.status(401).json({ error: 'Требуется авторизация (нет x-user-id)' });
    }

    const projectId = parseInt(req.params.projectId, 10);
    const { message } = req.body;

    // Проверка: проект существует
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Проверка: нет ли уже заявки
    const existingApplication = await prisma.application.findFirst({
      where: {
        userId,
        projectId
      }
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'Вы уже подали заявку на этот проект' });
    }

    const application = await prisma.application.create({
      data: {
        userId,
        projectId,
        message
      }
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Ошибка при создании заявки:', error);
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
};

// 📄 Получить заявки по проекту (для организатора)
exports.getProjectApplications = async (req, res) => {
  try {
    const userId = parseInt(req.headers['x-user-id'], 10);
    const projectId = parseInt(req.params.projectId, 10);

    if (!userId) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    // Проверяем, что пользователь — создатель проекта
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    if (project.createdBy !== userId) {
      return res.status(403).json({ error: 'Нет доступа к заявкам этого проекта' });
    }

    const applications = await prisma.application.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(applications);
  } catch (error) {
    console.error('Ошибка при получении заявок:', error);
    res.status(500).json({ error: 'Ошибка при получении заявок' });
  }
};

// 👤 Получить мои заявки
exports.getMyApplications = async (req, res) => {
  try {
    const userId = parseInt(req.headers['x-user-id'], 10);

    if (!userId) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(applications);
  } catch (error) {
    console.error('Ошибка при получении моих заявок:', error);
    res.status(500).json({ error: 'Ошибка при получении заявок' });
  }
};
