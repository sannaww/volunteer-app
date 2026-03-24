const prisma = require("../prismaClient");
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5001";
const POINTS_FOR_APPROVE = Number(process.env.POINTS_FOR_APPROVE || 10); // Баллы за одобрение

// Создать заявку
exports.createApplication = async ({ userId, projectId, message }) => {
  // Принимаем только active-проекты
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Проект не найден');
  if (project.status !== 'ACTIVE') throw new Error('Нельзя подать заявку на неактивный проект');

  // Проверяем дубль
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

// Мои заявки
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

// Заявки по проекту
exports.getProjectApplications = async ({ projectId, requesterId, requesterRole }) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Проект не найден');

  // Organizer видит только свои проекты
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

// Отмена заявки
exports.cancelMyApplication = async ({ applicationId, userId }) => {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error('Заявка не найдена');
  if (app.userId !== userId) throw new Error('Недостаточно прав для отмены этой заявки');
  if (app.status !== 'PENDING') throw new Error('Нельзя отменить заявку со статусом: ' + app.status);

  await prisma.application.delete({ where: { id: applicationId } });
  return { message: 'Заявка успешно отменена', cancelledApplicationId: applicationId };
};

// Смена статуса
exports.updateStatus = async ({ applicationId, newStatus, requesterId, requesterRole }) => {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { project: true }
  });
  
  if (!app) throw new Error('Заявка не найдена');

  // Organizer меняет только свои заявки
  if (requesterRole === 'organizer' && app.project.createdBy !== requesterId) {
    throw new Error('Нет прав для изменения этой заявки');
  }

  // Меняем только из PENDING
  if (app.status !== 'PENDING') {
    throw new Error('Нельзя изменить заявку со статусом: ' + app.status);
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status: newStatus },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
    }
  });

  // При одобрении начисляем баллы
  if (newStatus === "APPROVED") {

    // Проверяем дубль
    const already = await prisma.pointsLog.findUnique({
      where: { applicationId: updated.id }
    });

    if (!already) {
      // Начисляем баллы через auth-service
      const resp = await fetch(`${AUTH_SERVICE_URL}/internal/add-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: updated.userId,
          points: POINTS_FOR_APPROVE,
          reason: `Approve application #${updated.id}`
        })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error("Ошибка начисления баллов: " + text);
      }

      // Фиксируем начисление
      await prisma.pointsLog.create({
        data: {
          userId: updated.userId,
          applicationId: updated.id,
          points: POINTS_FOR_APPROVE,
          reason: "Approve application"
        }
      });
    }
  }

  return updated;
};
