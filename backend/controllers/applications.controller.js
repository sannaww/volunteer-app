const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Подать заявку
exports.createApplication = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    const application = await prisma.application.create({
      data: {
        message,
        userId,
        projectId: parseInt(projectId)
      }
    });

    res.status(201).json(application);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
};

// Получить заявки проекта
exports.getProjectApplications = async (req, res) => {
  try {
    const { projectId } = req.params;

    const applications = await prisma.application.findMany({
      where: { projectId: parseInt(projectId) },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении заявок' });
  }
};

// Мои заявки
exports.getMyApplications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        project: true
      }
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении заявок пользователя' });
  }
};
