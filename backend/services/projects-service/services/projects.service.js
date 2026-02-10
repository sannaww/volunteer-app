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

  // приведение дат
  if (updateData.startDate !== undefined) {
    updateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
  }
  if (updateData.endDate !== undefined) {
    updateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
  }
  if (updateData.volunteersRequired !== undefined) {
    updateData.volunteersRequired = parseInt(updateData.volunteersRequired, 10) || 1;
  }

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
