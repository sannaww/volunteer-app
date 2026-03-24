const prisma = require("../prismaClient");

// Считаем заявки для карточки проекта

exports.getAllProjects = async (query = {}) => {
  const {
    search,
    projectType,
    location,
    status,
    dateFrom,
    dateTo,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const where = {};

  // Статус
  if (status) {
    if (String(status).includes(",")) {
      where.status = { in: String(status).split(",") };
    } else {
      where.status = status;
    }
  } else {
    where.status = { not: "DRAFT" };
  }

  // Поиск
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { description: { contains: s, mode: "insensitive" } },
    ];
  }

  // Тип проекта
  if (projectType && String(projectType).trim()) {
    where.projectType = projectType;
  }

  // Локация
  if (location && String(location).trim()) {
    where.location = { contains: String(location).trim(), mode: "insensitive" };
  }

  // Диапазон дат
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

  // Сортировка
  const allowedSort = new Set(["createdAt", "startDate", "title"]);
  const safeSortBy = allowedSort.has(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const projects = await prisma.project.findMany({
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

  const ids = projects.map((p) => p.id);
  if (!ids.length) return projects;

  const totalGrouped = await prisma.application.groupBy({
    by: ["projectId"],
    where: { projectId: { in: ids } },
    _count: { _all: true },
  });

  const pendingGrouped = await prisma.application.groupBy({
    by: ["projectId"],
    where: { projectId: { in: ids }, status: "PENDING" },
    _count: { _all: true },
  });

  const totalMap = new Map(totalGrouped.map((r) => [r.projectId, r._count._all]));
  const pendingMap = new Map(pendingGrouped.map((r) => [r.projectId, r._count._all]));

  return projects.map((p) => ({
    ...p,
    applicationsCount: totalMap.get(p.id) || 0,
    pendingApplicationsCount: pendingMap.get(p.id) || 0,
  }));
};

exports.getProjectById = async (id) => {
  const project = await prisma.project.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
      applications: true,
    },
  });

  if (!project) return null;

  const [applicationsCount, pendingApplicationsCount] = await Promise.all([
    prisma.application.count({ where: { projectId: project.id } }),
    prisma.application.count({
      where: { projectId: project.id, status: "PENDING" },
    }),
  ]);

  return {
    ...project,
    applicationsCount,
    pendingApplicationsCount,
  };
};

exports.createProject = async (data) => {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status || "DRAFT",
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
      applications: true,
    },
  });
};

exports.updateProject = async (id, data) => {
  const updateData = { ...data };

  const toNullIfEmpty = (v) => (v === "" ? null : v);

  if (updateData.title !== undefined) updateData.title = String(updateData.title).trim();
  if (updateData.description !== undefined) updateData.description = String(updateData.description).trim();

  if (updateData.location !== undefined) updateData.location = toNullIfEmpty(updateData.location);
  if (updateData.contactInfo !== undefined) updateData.contactInfo = toNullIfEmpty(updateData.contactInfo);

  if (updateData.projectType !== undefined) {
    updateData.projectType = toNullIfEmpty(updateData.projectType);
  }

  if (updateData.status !== undefined) {
    if (updateData.status === "" || updateData.status === null) {
      delete updateData.status;
    }
  }

  if (updateData.startDate !== undefined) {
    updateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
  }
  if (updateData.endDate !== undefined) {
    updateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
  }

  if (updateData.volunteersRequired !== undefined) {
    if (updateData.volunteersRequired === "" || updateData.volunteersRequired === null) {
      delete updateData.volunteersRequired;
    } else {
      updateData.volunteersRequired = parseInt(updateData.volunteersRequired, 10) || 1;
    }
  }

  // Поля с фронта
  if (updateData.type !== undefined) {
    updateData.projectType = updateData.type;
    delete updateData.type;
  }

  if (updateData.volunteersNeeded !== undefined) {
    updateData.volunteersRequired = updateData.volunteersNeeded;
    delete updateData.volunteersNeeded;
  }

  const projectTypeMapRuToEnum = {
    "Экология": "ECOLOGY",
    "Помощь животным": "ANIMAL_WELFARE",
    "Образование": "EDUCATION",
    "Социальная помощь": "SOCIAL",
    "Культура": "CULTURAL",
    "Спорт": "SPORTS",
    "Медицина": "MEDICAL",
    "Другое": "OTHER",
  };

  if (updateData.projectType && projectTypeMapRuToEnum[updateData.projectType]) {
    updateData.projectType = projectTypeMapRuToEnum[updateData.projectType];
  }

  if (updateData.createdBy !== undefined) delete updateData.createdBy;

  return prisma.project.update({
    where: { id: parseInt(id, 10) },
    data: updateData,
    include: {
      creator: { select: { firstName: true, lastName: true } },
      applications: true,
    },
  });
};

exports.deleteProject = async (id) => {
  return prisma.project.delete({
    where: { id: parseInt(id, 10) },
  });
};

// Календарь
exports.getOrganizerProjectsForCalendar = async ({ organizerId, start, end }) => {
  const where = {
    startDate: { not: null, lt: end },
    endDate: { not: null, gte: start },
  };

  // Фильтр по владельцу нужен только для organizer
  if (organizerId !== null && organizerId !== undefined) {
    where.createdBy = organizerId;
  }

  return prisma.project.findMany({
    where,
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
      createdBy: true,
    },
  });
};

// Список проектов организатора
exports.getOrganizerProjects = async ({
  organizerId,
  status = "ALL",
  includeDrafts = true,
  search = "",
}) => {
  const where = {};

  // Admin видит все, organizer только свои
  if (organizerId !== null && organizerId !== undefined) {
    where.createdBy = organizerId;
  }

  const safeStatus = String(status || "ALL").toUpperCase();
  const safeIncludeDrafts = String(includeDrafts) === "true" || includeDrafts === true;

  if (safeStatus !== "ALL") {
    where.status = safeStatus;
  } else {
    if (!safeIncludeDrafts) where.status = { not: "DRAFT" };
  }

  const s = String(search || "").trim();
  if (s) {
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { description: { contains: s, mode: "insensitive" } },
      { location: { contains: s, mode: "insensitive" } },
      { contactInfo: { contains: s, mode: "insensitive" } },
    ];
  }

  return prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { id: true, firstName: true, lastName: true, role: true } },
      applications: true,
    },
  });
};
