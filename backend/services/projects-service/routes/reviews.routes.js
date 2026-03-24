const router = require("express").Router();
const reviewsController = require("../controllers/reviews.controller");

// Сначала /my, потом динамические маршруты
router.get("/my", reviewsController.getMyReviews);

router.put("/:id", reviewsController.updateMyReview);

router.delete("/:id", reviewsController.deleteMyReview);

router.get("/:projectId", reviewsController.getReviewsByProject);

router.post("/:projectId", reviewsController.createReview);

module.exports = router;
