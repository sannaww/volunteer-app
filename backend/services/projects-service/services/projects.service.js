const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllProjects = async (query = {}) => {
  const {
    search,
    projectType,
    location,
    status,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where = {};

  // 1) Статус
  if (status) {
    // поддержка нескольких статусов через запятую
    if (String(status).includes(',')) {
      where.status = { in: String(status).split(',') };
    } else {
      where.status = status;
    }
  } else {
    // по умолчанию скрываем черновики (для общего списка)
    where.status = { not: 'DRAFT' };
  }

  // 2) Поиск по названию/описанию
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { title: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
    ];
  }

  // 3) Тип проекта
  if (projectType && String(projectType).trim()) {
    where.projectType = projectType;
  }

  // 4) Локация (подстрока)
  if (location && String(location).trim()) {
    where.location = { contains: String(location).trim(), mode: 'insensitive' };
  }

  // 5) Диапазон дат (или проекты без даты)
  if (dateFrom || dateTo) {
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        {
          startDate: {
            gte: dateFrom ? new Date(dateFrom) : undefined,
            lte: dateTo ? new Date(dateTo) : undefined,
          },
        },
        { startDate: null },
      ],
    });
  }

  // 6) Сортировка (защита от неверных полей)
  const allowedSort = new Set(['createdAt', 'startDate', 'title']);
  const safeSortBy = allowedSort.has(sortBy) ? sortBy : 'createdAt';
  const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  return prisma.project.findMany({
    where,
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
      applications: true,
    },
    orderBy: {
      [safeSortBy]: safeSortOrder,
    },
  });
};


exports.getProjectById = async (id) => {
  return prisma.project.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true, role: true }
      },
      applications: true
    }
  });
};


exports.createProject = async (data) => {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status || 'DRAFT',
      createdBy: data.createdBy,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      location: data.location || null,
      projectType: data.projectType || null,
      volunteersRequired: data.volunteersRequired ? parseInt(data.volunteersRequired, 10) : 1,
      contactInfo: data.contactInfo || null,
    },
    include: {
      creator: { select: { firstName: true, lastName: true } },
      applications: true
    }
  });
};

exports.updateProject = async (id, data) => {
  const updateData = { ...data };

  // 1) Пустые строки -> null (чтобы Prisma не падала)
  const toNullIfEmpty = (v) => (v === "" ? null : v);

  if (updateData.title !== undefined) updateData.title = String(updateData.title).trim();
  if (updateData.description !== undefined) updateData.description = String(updateData.description).trim();

  if (updateData.location !== undefined) updateData.location = toNullIfEmpty(updateData.location);
  if (updateData.contactInfo !== undefined) updateData.contactInfo = toNullIfEmpty(updateData.contactInfo);

  // 2) projectType: если пусто -> null, иначе оставляем
  if (updateData.projectType !== undefined) {
    updateData.projectType = toNullIfEmpty(updateData.projectType);
  }

  // 3) status: если пусто -> удаляем, чтобы не пытаться записать ""
  if (updateData.status !== undefined) {
    if (updateData.status === "" || updateData.status === null) {
      delete updateData.status;
    }
  }

  // 4) Даты: "" -> null, иначе Date
  if (updateData.startDate !== undefined) {
    updateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
  }
  if (updateData.endDate !== undefined) {
    updateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
  }

  // 5) volunteersRequired: строка -> число, "" -> не трогаем/или null
  if (updateData.volunteersRequired !== undefined) {
    if (updateData.volunteersRequired === "" || updateData.volunteersRequired === null) {
      delete updateData.volunteersRequired;
    } else {
      updateData.volunteersRequired = parseInt(updateData.volunteersRequired, 10) || 1;
    }
  }

  // 6) Важно: не даём обновлять createdBy с фронта
  if (updateData.createdBy !== undefined) delete updateData.createdBy;

  return prisma.project.update({
    where: { id: parseInt(id, 10) },
    data: updateData,
    include: {
      creator: { select: { firstName: true, lastName: true } },
      applications: true
    }
  });
};


exports.deleteProject = async (id) => {
  return prisma.project.delete({
    where: { id: parseInt(id, 10) }
  });
};

exports.getOrganizerProjectsForCalendar = async ({ organizerId, start, end }) => {
  return prisma.project.findMany({
    where: {
      createdBy: organizerId,

      // ✅ берём только те, у кого даты заполнены
      startDate: { not: null, lt: end },
      endDate: { not: null, gte: start },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      location: true,
      projectType: true,
      volunteersRequired: true,
      contactInfo: true,
    },
  });
};
