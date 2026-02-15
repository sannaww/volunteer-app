const router = require("express").Router();

const {
  getReviewsByProject,
  createReview,
  getMyReviews,
  deleteMyReview,
} = require("../controllers/reviews.controller");

// ⚠️ ВАЖНО: сначала конкретные маршруты, потом динамические

// Мои отзывы
router.get("/my", getMyReviews);

// Удалить мой отзыв (id — cuid строка)
router.delete("/:id", deleteMyReview);

// Получить отзывы проекта
router.get("/:projectId", getReviewsByProject);

// Создать отзыв
router.post("/:projectId", createReview);

module.exports = router;
