const router = require("express").Router();
const { addPoints } = require("../controllers/internalPoints.controller");

router.post("/add-points", addPoints);

module.exports = router;
