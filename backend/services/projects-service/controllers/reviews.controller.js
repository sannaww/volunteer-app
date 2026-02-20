const prisma = require("../prismaClient");

const APPLICATIONS_SERVICE_URL = "http://localhost:5003";

// projectId в schema.prisma: Int
function parseProjectId(projectIdParam) {
  const n = Number(projectIdParam);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

async function recalcProjectRating(projectId, tx = prisma) {
  const agg = await tx.review.aggregate({
    where: { projectId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avgRating = agg._avg.rating ?? 0;
  const reviewsCount = agg._count.rating ?? 0;

  await tx.project.update({
    where: { id: projectId },
    data: { avgRating, reviewsCount },
  });

  return { avgRating, reviewsCount };
}

// ✅ GET /reviews/my  (Мои отзывы)
exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = (req.headers["x-user-role"] || "").toLowerCase();

    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });

    // Если хочешь строго только волонтёру — оставь проверку
    if (userRole && userRole !== "volunteer") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const reviews = await prisma.review.findMany({
      where: { authorId: String(userId) },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            startDate: true,
            endDate: true,
            avgRating: true,
            reviewsCount: true,
          },
        },
      },
    });

    return res.json(reviews);
  } catch (err) {
    console.error("getMyReviews error:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};

// ✅ DELETE /reviews/:id  (Удалить мой отзыв)
exports.deleteMyReview = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = (req.headers["x-user-role"] || "").toLowerCase();
    const reviewId = String(req.params.id || "").trim(); // cuid String

    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });

    // Если хочешь строго только волонтёру — оставь проверку
    if (userRole && userRole !== "volunteer") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!reviewId) return res.status(400).json({ message: "Invalid review id" });

    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: { id: true, authorId: true, projectId: true },
      });

      if (!review) return { notFound: true };

      if (String(review.authorId) !== String(userId)) {
        return { forbidden: true };
      }

      await tx.review.delete({ where: { id: reviewId } });

      const stats = await recalcProjectRating(review.projectId, tx);

      return { deleted: true, projectId: review.projectId, projectStats: stats };
    });

    if (result.notFound) return res.status(404).json({ message: "Review not found" });
    if (result.forbidden) {
      return res.status(403).json({ message: "Вы можете удалить только свой отзыв" });
    }

    return res.json(result);
  } catch (err) {
    console.error("deleteMyReview error:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};

// ✅ PUT /reviews/:id  (Редактировать мой отзыв)
exports.updateMyReview = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userRole = (req.headers["x-user-role"] || "").toLowerCase();
    const reviewId = String(req.params.id || "").trim();

    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });
    if (userRole && userRole !== "volunteer") {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!reviewId) return res.status(400).json({ message: "Invalid review id" });

    const rating = Number(req.body.rating);
    const text = req.body.text?.trim() || null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating должен быть числом от 1 до 5" });
    }
    if (text && text.length > 1000) {
      return res.status(400).json({ message: "text слишком длинный (макс 1000 символов)" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { id: reviewId },
        select: { id: true, authorId: true, projectId: true },
      });

      if (!existing) return { notFound: true };

      if (String(existing.authorId) !== String(userId)) {
        return { forbidden: true };
      }

      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { rating, text },
      });

      const stats = await recalcProjectRating(existing.projectId, tx);

      return { updated: true, review: updated, projectId: existing.projectId, projectStats: stats };
    });

    if (result.notFound) return res.status(404).json({ message: "Review not found" });
    if (result.forbidden) {
      return res.status(403).json({ message: "Вы можете редактировать только свой отзыв" });
    }

    return res.json(result);
  } catch (err) {
    console.error("updateMyReview error:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};

// ✅ GET /reviews/:projectId
exports.getReviewsByProject = async (req, res) => {
  try {
    const projectId = parseProjectId(req.params.projectId);
    if (!projectId) return res.status(400).json({ message: "Invalid projectId" });

    const reviews = await prisma.review.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Подтягиваем имя автора (User.id — Int, Review.authorId — String)
    const authorIds = Array.from(
      new Set(
        reviews
          .map((r) => Number(r.authorId))
          .filter((n) => Number.isInteger(n) && n > 0)
      )
    );

    let userMap = new Map();
    if (authorIds.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, firstName: true, lastName: true },
      });

      userMap = new Map(
        users.map((u) => [u.id, `${u.firstName || ""} ${u.lastName || ""}`.trim()])
      );
    }

    const enriched = reviews.map((r) => ({
      ...r,
      authorName: userMap.get(Number(r.authorId)) || "Пользователь",
    }));

    return res.json(enriched);
  } catch (err) {
    console.error("getReviewsByProject error:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};

// ✅ POST /reviews/:projectId
exports.createReview = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });

    const projectId = parseProjectId(req.params.projectId);
    if (!projectId) return res.status(400).json({ message: "Invalid projectId" });

    const rating = Number(req.body.rating);
    const text = req.body.text?.trim() || null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating должен быть числом от 1 до 5" });
    }
    if (text && text.length > 1000) {
      return res.status(400).json({ message: "text слишком длинный (макс 1000 символов)" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.status === "CANCELLED") {
      return res.status(403).json({ message: "Нельзя оставлять отзывы на отменённые проекты" });
    }

    const userIdInt = Number(userId);
    if (!Number.isInteger(userIdInt) || userIdInt <= 0) {
      return res.status(400).json({ message: "Некорректный userId" });
    }

    // Проверка участия в applications-service
    const checkUrl = `${APPLICATIONS_SERVICE_URL}/internal/check-approved?userId=${userIdInt}&projectId=${projectId}`;
    const checkRes = await fetch(checkUrl);

    if (!checkRes.ok) {
      const t = await checkRes.text();
      return res.status(502).json({
        message: "Ошибка проверки участия (applications-service)",
        details: t,
      });
    }

    const checkData = await checkRes.json();
    if (!checkData.canReview) {
      return res.status(403).json({
        message: "Оставить отзыв можно только после одобрения заявки.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          projectId,
          authorId: String(userId),
          rating,
          text,
        },
      });

      const stats = await recalcProjectRating(projectId, tx);

      return { review, projectStats: stats };
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error("createReview error:", err);

    if (err.code === "P2002") {
      return res.status(409).json({ message: "Вы уже оставили отзыв на этот проект" });
    }

    return res.status(500).json({ message: "Server error", details: err.message });
  }
};