const router = require("express").Router();
const { checkApproved } = require("../controllers/internal.controller");

router.get("/check-approved", checkApproved);

module.exports = router;
