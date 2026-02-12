const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Создать заявку (volunteer)
exports.createApplication = async ({ userId, projectId, message }) => {
  // проект должен быть ACTIVE
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Проект не найден');
  if (project.status !== 'ACTIVE') throw new Error('Нельзя подать заявку на неактивный проект');

  // уникальность (userId, projectId) обеспечена @@unique, но сделаем красивую ошибку
  const existing = await prisma.application.findFirst({
    where: { userId, projectId }
  });
  if (existing) throw new Error('Вы уже подали заявку на этот проект');

  return prisma.application.create({
    data: {
      userId,
      projectId,
      message: message || null,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      project: { select: { id: true, title: true } },
    },
  });
};

// Мои заявки (любая роль, но реально пользуется volunteer)
exports.getMyApplications = async (userId) => {
  return prisma.application.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          creator: { select: { id: true, firstName: true, lastName: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Заявки по проекту (organizer/admin)
exports.getProjectApplications = async ({ projectId, requesterId, requesterRole }) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Проект не найден');

  // organizer -> только свой проект
  if (requesterRole === 'organizer' && project.createdBy !== requesterId) {
    throw new Error('Нет доступа к заявкам этого проекта');
  }

  const apps = await prisma.application.findMany({
  where: { projectId },
  include: {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    },
  },
});
return apps;
};

// Отмена заявки (volunteer, только своя и только PENDING)
exports.cancelMyApplication = async ({ applicationId, userId }) => {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error('Заявка не найдена');
  if (app.userId !== userId) throw new Error('Недостаточно прав для отмены этой заявки');
  if (app.status !== 'PENDING') throw new Error('Нельзя отменить заявку со статусом: ' + app.status);

  await prisma.application.delete({ where: { id: applicationId } });
  return { message: 'Заявка успешно отменена', cancelledApplicationId: applicationId };
};

// Смена статуса (organizer/admin)
exports.updateStatus = async ({ applicationId, newStatus, requesterId, requesterRole }) => {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { project: true }
  });
  if (!app) throw new Error('Заявка не найдена');

  // organizer -> только свой проект
  if (requesterRole === 'organizer' && app.project.createdBy !== requesterId) {
    throw new Error('Нет прав для изменения этой заявки');
  }

  // менять статус можно только из PENDING (логично)
  if (app.status !== 'PENDING') {
    throw new Error('Нельзя изменить заявку со статусом: ' + app.status);
  }

  return prisma.application.update({
    where: { id: applicationId },
    data: { status: newStatus },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
    }
  });
};
