const path = require("path");
const express = require("express");
const cors = require("cors");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
} catch (error) {
  // Локально читаем .env
}

const projectsRoutes = require("./routes/projects.routes");
const favoritesRoutes = require("./routes/favorites.routes");
const reviewsRoutes = require("./routes/reviews.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/favorites", favoritesRoutes);

// Gateway ведёт /api/reviews сюда
app.use("/reviews", reviewsRoutes);

// Маршруты проектов без /api/projects
app.use("/", projectsRoutes);

const PORT = Number(process.env.PORT) || 5002;

app.listen(PORT, () => {
  console.log(`Projects Service running on port ${PORT}`);
});
