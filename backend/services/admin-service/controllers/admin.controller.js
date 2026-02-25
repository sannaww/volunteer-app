const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function monthKey(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabelRu(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
}

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isBlocked: true,
        createdAt: true
      },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked: true },
      select: { id: true, email: true, role: true, isBlocked: true }
    });
    res.json({ message: 'Пользователь заблокирован', user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка блокировки' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked: false },
      select: { id: true, email: true, role: true, isBlocked: true }
    });
    res.json({ message: 'Пользователь разблокирован', user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка разблокировки' });
  }
};

exports.changeRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    const allowed = ['volunteer', 'organizer', 'admin'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true }
    });
    res.json({ message: 'Роль изменена', user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка изменения роли' });
  }
};

exports.getPendingProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: 'DRAFT' },
      include: { creator: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    console.error('Admin getPendingProjects error:', error);
    res.status(500).json({ error: 'Ошибка получения проектов на модерации' });
  }
};

exports.approveProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.update({ where: { id }, data: { status: 'ACTIVE' } });
    res.json({ message: 'Проект одобрен', project });
  } catch (error) {
    console.error('Admin approveProject error:', error);
    res.status(500).json({ error: 'Ошибка одобрения проекта' });
  }
};

exports.rejectProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json({ message: 'Проект отклонен', project });
  } catch (error) {
    console.error('Admin rejectProject error:', error);
    res.status(500).json({ error: 'Ошибка отклонения проекта' });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: { project: { select: { id: true, title: true, status: true } } },
    });

    const authorIdsInt = Array.from(
      new Set(reviews.map((r) => Number(r.authorId)).filter((n) => Number.isInteger(n) && n > 0))
    );

    let usersById = new Map();
    if (authorIdsInt.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: authorIdsInt } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      usersById = new Map(users.map((u) => [u.id, u]));
    }

    const enriched = reviews.map((r) => {
      const uid = Number(r.authorId);
      const u = usersById.get(uid);
      return {
        ...r,
        authorName: u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : null,
        authorEmail: u?.email || null,
      };
    });

    res.json(enriched);
  } catch (e) {
    console.error("getAllReviews error:", e);
    res.status(500).json({ message: "Failed to load reviews" });
  }
};

exports.deleteReviewById = async (req, res) => {
  const reviewId = String(req.params.id || "").trim();
  if (!reviewId) return res.status(400).json({ message: "Invalid review id" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: { id: true, projectId: true },
      });
      if (!review) return { notFound: true };

      await tx.review.delete({ where: { id: reviewId } });

      const agg = await tx.review.aggregate({
        where: { projectId: review.projectId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      const newAvg = agg._avg.rating ?? 0;
      const newCount = agg._count._all ?? 0;

      await tx.project.update({
        where: { id: review.projectId },
        data: { avgRating: newAvg, reviewsCount: newCount },
      });

      return { deleted: true, projectId: review.projectId, avgRating: newAvg, reviewsCount: newCount };
    });

    if (result.notFound) return res.status(404).json({ message: "Review not found" });
    res.json(result);
  } catch (e) {
    console.error("deleteReviewById error:", e);
    res.status(500).json({ message: "Failed to delete review" });
  }
};

// Reports
exports.getReportsSummary = async (req, res) => {
  try {
    const [usersTotal, projectsTotal, activeProjects, draftProjects, completedProjects, cancelledProjects, reviewsTotal] =
      await Promise.all([
        prisma.user.count(),
        prisma.project.count(),
        prisma.project.count({ where: { status: 'ACTIVE' } }),
        prisma.project.count({ where: { status: 'DRAFT' } }),
        prisma.project.count({ where: { status: 'COMPLETED' } }),
        prisma.project.count({ where: { status: 'CANCELLED' } }),
        prisma.review.count(),
      ]);

    let applicationsTotal = 0;
    try {
      applicationsTotal = await prisma.application.count();
    } catch (e) {
      console.warn('application.count unavailable:', e?.message);
    }

    res.json({
      usersTotal,
      projectsTotal,
      activeProjects,
      draftProjects,
      completedProjects,
      cancelledProjects,
      reviewsTotal,
      applicationsTotal,
    });
  } catch (e) {
    console.error('getReportsSummary error:', e);
    res.status(500).json({ error: 'Ошибка получения сводных показателей' });
  }
};

exports.getUserGrowthReport = async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months, 10) || 12, 1), 36);
    const users = await prisma.user.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const bucketMap = new Map();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      bucketMap.set(monthKey(d), 0);
    }

    for (const u of users) {
      const key = monthKey(u.createdAt);
      if (bucketMap.has(key)) bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
    }

    let cumulative = 0;
    const items = Array.from(bucketMap.entries()).map(([key, count]) => {
      cumulative += count;
      return { month: key, label: monthLabelRu(key), newUsers: count, cumulative };
    });

    res.json({ months, items });
  } catch (e) {
    console.error('getUserGrowthReport error:', e);
    res.status(500).json({ error: 'Ошибка получения отчета по росту пользователей' });
  }
};

exports.getProjectCategoriesReport = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      select: { projectType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const counts = new Map();
    for (const p of projects) {
      const key = p.projectType || 'OTHER';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const items = Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ items });
  } catch (e) {
    console.error('getProjectCategoriesReport error:', e);
    res.status(500).json({ error: 'Ошибка получения отчета по категориям проектов' });
  }
};

exports.getProjectStatusesReport = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({ select: { status: true } });

    const counts = new Map();
    for (const p of projects) {
      const key = p.status || 'UNKNOWN';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const items = Array.from(counts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ items });
  } catch (e) {
    console.error('getProjectStatusesReport error:', e);
    res.status(500).json({ error: 'Ошибка получения отчета по статусам проектов' });
  }
};