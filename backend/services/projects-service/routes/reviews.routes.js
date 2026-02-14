const router = require("express").Router();
const {
  getReviewsByProject,
  createReview,
} = require("../controllers/reviews.controller");

router.get("/:projectId", getReviewsByProject);
router.post("/:projectId", createReview);

module.exports = router;
