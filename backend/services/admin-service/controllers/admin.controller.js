const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        // если такого поля нет — уберёшь
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

// Получить проекты на модерации (DRAFT)
exports.getPendingProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: 'DRAFT' },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Admin getPendingProjects error:', error);
    res.status(500).json({ error: 'Ошибка получения проектов на модерации' });
  }
};

// Одобрить проект -> ACTIVE
exports.approveProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const project = await prisma.project.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    res.json({ message: 'Проект одобрен', project });
  } catch (error) {
    console.error('Admin approveProject error:', error);
    res.status(500).json({ error: 'Ошибка одобрения проекта' });
  }
};

// Отклонить проект -> CANCELLED (или оставить DRAFT)
exports.rejectProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const project = await prisma.project.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Проект отклонен', project });
  } catch (error) {
    console.error('Admin rejectProject error:', error);
    res.status(500).json({ error: 'Ошибка отклонения проекта' });
  }
};

// GET /api/admin/reviews
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, title: true, status: true } },
      },
    });

    // Пытаемся сопоставить authorId (String) -> User.id (Int), если authorId хранит число строкой
    const authorIdsInt = Array.from(
      new Set(
        reviews
          .map((r) => Number(r.authorId))
          .filter((n) => Number.isInteger(n) && n > 0)
      )
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

// DELETE /api/admin/reviews/:id
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

      // Пересчёт рейтинга проекта
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

      return {
        deleted: true,
        projectId: review.projectId,
        avgRating: newAvg,
        reviewsCount: newCount,
      };
    });

    if (result.notFound) return res.status(404).json({ message: "Review not found" });
    res.json(result);
  } catch (e) {
    console.error("deleteReviewById error:", e);
    res.status(500).json({ message: "Failed to delete review" });
  }
};