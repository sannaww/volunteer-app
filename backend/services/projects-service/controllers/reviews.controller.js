const prisma = require("../prismaClient");
const APPLICATIONS_SERVICE_URL = "http://localhost:5003";

function normalizeProjectId(projectIdParam) {
  const asNumber = Number(projectIdParam);
  if (!Number.isNaN(asNumber) && projectIdParam !== "") return asNumber;
  return projectIdParam;
}

async function recalcProjectRating(projectId) {
  const agg = await prisma.review.aggregate({
    where: { projectId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avgRating = agg._avg.rating || 0;
  const reviewsCount = agg._count.rating || 0;

  await prisma.project.update({
    where: { id: projectId },
    data: { avgRating, reviewsCount },
  });

  return { avgRating, reviewsCount };
}

// ✅ GET /reviews/my  (Мои отзывы)
exports.getMyReviews = async (req, res) => {
    console.log("HIT getMyReviews", req.originalUrl);
  try {
    const userId = req.headers["x-user-id"];
    const userRole = (req.headers["x-user-role"] || "").toLowerCase();

    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });

    // если хочешь строго только волонтёру — оставь проверку
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
    const reviewId = req.params.id; // String cuid()

    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });

    // если хочешь строго только волонтёру — оставь проверку
    if (userRole && userRole !== "volunteer") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!reviewId) return res.status(400).json({ message: "Invalid review id" });

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, authorId: true, projectId: true },
    });

    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.authorId !== String(userId)) {
      return res.status(403).json({ message: "Вы можете удалить только свой отзыв" });
    }

    await prisma.review.delete({ where: { id: reviewId } });

    // пересчитываем рейтинг проекта
    const stats = await recalcProjectRating(review.projectId);

    return res.json({
      message: "Review deleted",
      projectId: review.projectId,
      projectStats: stats,
    });
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
    const reviewId = req.params.id;

    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });
    if (userRole && userRole !== "volunteer") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const rating = Number(req.body.rating);
    const text = req.body.text?.trim() || null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating должен быть числом от 1 до 5" });
    }
    if (text && text.length > 1000) {
      return res.status(400).json({ message: "text слишком длинный (макс 1000 символов)" });
    }

    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, authorId: true, projectId: true },
    });

    if (!existing) return res.status(404).json({ message: "Review not found" });
    if (existing.authorId !== String(userId)) {
      return res.status(403).json({ message: "Вы можете редактировать только свой отзыв" });
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { rating, text },
    });

    const stats = await recalcProjectRating(existing.projectId);

    return res.json({
      message: "Review updated",
      review: updated,
      projectId: existing.projectId,
      projectStats: stats,
    });
  } catch (err) {
    console.error("updateMyReview error:", err);
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};


// GET /reviews/:projectId
exports.getReviewsByProject = async (req, res) => {
  console.log("HIT getReviewsByProject", req.params.projectId);
  try {
    const projectId = normalizeProjectId(req.params.projectId);

    const reviews = await prisma.review.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    // ✅ подтягиваем имя автора (User.id — Int, Review.authorId — String)
    const authorIds = [...new Set(
      reviews
        .map((r) => Number(r.authorId))
        .filter((n) => Number.isFinite(n))
    )];

    const users = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()])
    );

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


// POST /reviews/:projectId
exports.createReview = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Missing x-user-id" });

    const projectId = normalizeProjectId(req.params.projectId);

    const rating = Number(req.body.rating);
    const text = req.body.text?.trim() || null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating должен быть числом от 1 до 5" });
    }
    if (text && text.length > 1000) {
      return res.status(400).json({ message: "text слишком длинный (макс 1000 символов)" });
    }

    // проверим что проект существует
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: "Project not found" });

    // ✅ Проверяем: есть ли APPROVED заявка у пользователя на этот проект
    const userIdInt = Number(userId); // x-user-id приходит строкой, приводим к числу
    if (Number.isNaN(userIdInt)) {
      return res.status(400).json({ message: "Некорректный userId" });
    }

    if (project.status === "CANCELLED") {
      return res.status(403).json({ message: "Нельзя оставлять отзывы на отменённые проекты" });
    }

    const checkUrl = `${APPLICATIONS_SERVICE_URL}/internal/check-approved?userId=${userIdInt}&projectId=${projectId}`;
    const checkRes = await fetch(checkUrl);
    if (!checkRes.ok) {
      const text = await checkRes.text();
      return res.status(502).json({
        message: "Ошибка проверки участия (applications-service)",
        details: text,
      });
    }
    const checkData = await checkRes.json();
    if (!checkData.canReview) {
      return res.status(403).json({
        message: "Оставить отзыв можно только после одобрения заявки.",
      });
    }
    // создаём отзыв (один на проект на пользователя)
    const review = await prisma.review.create({
      data: {
        projectId,
        authorId: String(userId),
        rating,
        text,
      },
    });
    // пересчитываем рейтинг проекта
    const stats = await recalcProjectRating(projectId);
    return res.status(201).json({ review, projectStats: stats });
  } catch (err) {
    console.error("createReview error:", err);
    // Prisma: нарушен @@unique([projectId, authorId]) → уже есть отзыв
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Вы уже оставили отзыв на этот проект" });
    }
    return res.status(500).json({ message: "Server error", details: err.message });
  }
};