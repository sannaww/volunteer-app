const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Получить все проекты
exports.getAllProjects = async () => {
  return prisma.project.findMany({
    include: {
      creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      applications: true
    }
  });
};

// Получить проект по ID
exports.getProjectById = async (id) => {
  return prisma.project.findUnique({
    where: { id: parseInt(id) },
    include: {
      creator: true,
      applications: true
    }
  });
};

// Создать проект
exports.createProject = async (data, user) => {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status || 'DRAFT',
      createdBy: user.userId
    }
  });
};
