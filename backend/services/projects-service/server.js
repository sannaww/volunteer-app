require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const path = require("path");
const express = require("express");
const cors = require("cors");

const projectsRoutes = require("./routes/projects.routes");
const favoritesRoutes = require("./routes/favorites.routes");
const reviewsRoutes = require("./routes/reviews.routes");

const app = express();

app.use(cors());
app.use(express.json());

// как было
app.use("/favorites", favoritesRoutes);

// ✅ reviews теперь без /api, потому что gateway переписывает /api/reviews -> /reviews
app.use("/reviews", reviewsRoutes);

// ВАЖНО — без /api/projects
app.use("/", projectsRoutes);

const PORT = 5002;

app.listen(PORT, () => {
  console.log(`Projects Service running on port ${PORT}`);
});
