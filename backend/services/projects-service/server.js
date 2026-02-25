const path = require("path");
const express = require("express");
const cors = require("cors");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
} catch (error) {
  // dotenv is optional when env vars are injected by container runtime
}

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

const PORT = Number(process.env.PORT) || 5002;

app.listen(PORT, () => {
  console.log(`Projects Service running on port ${PORT}`);
});
