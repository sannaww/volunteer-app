const router = require("express").Router();
const { canReview } = require("../controllers/reviewEligibility.controller");

router.get("/can-review/:projectId", canReview);

module.exports = router;
