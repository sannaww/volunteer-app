const prisma = require("../prismaClient");

 //Добавили поля: - applicationsCount (всего заявок) 
 //- pendingApplicationsCount (новых заявок со статусом PENDING)
 //чтобы на карточке проекта поле "Заявки: Всего" не было пустым.

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

  // 1) Статус
  if (status) {
    // поддержка нескольких статусов через запятую
    if (String(status).includes(",")) {
      where.status = { in: String(status).split(",") };
    } else {
      where.status = status;
    }
  } else {
    // по умолчанию скрываем черновики (для общего списка)
    where.status = { not: "DRAFT" };
  }

  // 2) Поиск по названию/описанию
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { description: { contains: s, mode: "insensitive" } },
    ];
  }

  // 3) Тип проекта
  if (projectType && String(projectType).trim()) {
    where.projectType = projectType;
  }

  // 4) Локация (подстрока)
  if (location && String(location).trim()) {
    where.location = { contains: String(location).trim(), mode: "insensitive" };
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
  const allowedSort = new Set(["createdAt", "startDate", "title"]);
  const safeSortBy = allowedSort.has(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  // --- 1) Забираем проекты как раньше ---
  const projects = await prisma.project.findMany({
    where,
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
      // оставляем как было, чтобы ничего не сломать в других местах
      applications: true,
    },
    orderBy: {
      [safeSortBy]: safeSortOrder,
    },
  });

  // --- 2) Считаем заявки по projectId (всего + PENDING) ---
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
  const pendingMap = new Map(
    pendingGrouped.map((r) => [r.projectId, r._count._all])
  );

  // --- 3) Возвращаем проекты + новые поля ---
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
      volunteersRequired: data.volunteersRequired
        ? parseInt(data.volunteersRequired, 10)
        : 1,
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

  // 1) Пустые строки -> null (чтобы Prisma не падала)
  const toNullIfEmpty = (v) => (v === "" ? null : v);

  if (updateData.title !== undefined)
    updateData.title = String(updateData.title).trim();
  if (updateData.description !== undefined)
    updateData.description = String(updateData.description).trim();

  if (updateData.location !== undefined)
    updateData.location = toNullIfEmpty(updateData.location);
  if (updateData.contactInfo !== undefined)
    updateData.contactInfo = toNullIfEmpty(updateData.contactInfo);

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
    updateData.startDate = updateData.startDate
      ? new Date(updateData.startDate)
      : null;
  }
  if (updateData.endDate !== undefined) {
    updateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
  }

  // 5) volunteersRequired: строка -> число, "" -> не трогаем/или null
  if (updateData.volunteersRequired !== undefined) {
    if (
      updateData.volunteersRequired === "" ||
      updateData.volunteersRequired === null
    ) {
      delete updateData.volunteersRequired;
    } else {
      updateData.volunteersRequired =
        parseInt(updateData.volunteersRequired, 10) || 1;
    }
  }
// ✅ Маппинг фронтовых полей -> полям Prisma модели
// старое название -> новое (по твоей схеме)
if (updateData.type !== undefined) {
  updateData.projectType = updateData.type;
  delete updateData.type;
}

if (updateData.volunteersNeeded !== undefined) {
  updateData.volunteersRequired = updateData.volunteersNeeded;
  delete updateData.volunteersNeeded;
}
// ✅ Маппинг русских значений -> enum ProjectType (Prisma)
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

// Если прилетело по-русски — переведём в enum
if (updateData.projectType && projectTypeMapRuToEnum[updateData.projectType]) {
  updateData.projectType = projectTypeMapRuToEnum[updateData.projectType];
}

  // 6) Важно: не даём обновлять createdBy с фронта
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

// Список проектов текущего организатора
// status: ALL | ACTIVE | COMPLETED | CANCELLED | DRAFT
// includeDrafts: true/false
// search: строка
exports.getOrganizerProjects = async ({ organizerId, status = "ALL", includeDrafts = true, search = "" }) => {
  const where = { createdBy: organizerId };

  const safeStatus = String(status || "ALL").toUpperCase();
  const safeIncludeDrafts = String(includeDrafts) === "true" || includeDrafts === true;

  // статус
  if (safeStatus !== "ALL") {
    where.status = safeStatus;
  } else {
    // ALL
    if (!safeIncludeDrafts) where.status = { not: "DRAFT" };
  }

  // поиск (title/description/location/contactInfo)
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