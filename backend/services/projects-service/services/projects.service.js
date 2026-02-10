const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllProjects = async (query = {}) => {
  const { status } = query;

  const where = {};
  if (status) where.status = status;

  return prisma.project.findMany({
    where,
    include: {
      creator: {
        select: { firstName: true, lastName: true }
      },
      applications: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

exports.getProjectById = async (id) => {
  return prisma.project.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      creator: true,
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
