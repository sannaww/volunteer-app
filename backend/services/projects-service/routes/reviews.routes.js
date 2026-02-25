const router = require("express").Router();
const reviewsController = require("../controllers/reviews.controller");

// ⚠️ ВАЖНО: сначала конкретные маршруты, потом динамические

// Мои отзывы
router.get("/my", reviewsController.getMyReviews);

// Редактировать мой отзыв (id — cuid строка)
router.put("/:id", reviewsController.updateMyReview);

// Удалить мой отзыв (id — cuid строка)
router.delete("/:id", reviewsController.deleteMyReview);

// Получить отзывы проекта (projectId — Int)
router.get("/:projectId", reviewsController.getReviewsByProject);

// Создать отзыв (projectId — Int)
router.post("/:projectId", reviewsController.createReview);

module.exports = router;