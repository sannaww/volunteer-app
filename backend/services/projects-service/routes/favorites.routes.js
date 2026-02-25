const router = require("express").Router();
const {
  addFavorite,
  removeFavorite,
  getMyFavorites,
} = require("../controllers/favorites.controller");

router.get("/", getMyFavorites);
router.post("/:projectId", addFavorite);
router.delete("/:projectId", removeFavorite);

module.exports = router;
