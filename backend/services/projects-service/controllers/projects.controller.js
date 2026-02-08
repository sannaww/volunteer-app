const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// Получить все проекты
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении проектов' });
  }
};

// Получить проект по ID
exports.getProjectById = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении проекта' });
  }
};

// Создать проект
exports.createProject = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, 'your-secret-key');

    const { title, description } = req.body;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        createdBy: decoded.userId
      }
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: 'Ошибка при создании проекта' });
  }
};
