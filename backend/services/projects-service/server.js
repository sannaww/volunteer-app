const express = require('express');
const cors = require('cors');
const projectsRoutes = require('./routes/projects.routes');
const favoritesRoutes = require("./routes/favorites.routes");
const reviewsRoutes = require("./routes/reviews.routes");
const reviewEligibilityRoutes = require("./routes/reviewEligibility.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/favorites", favoritesRoutes);
app.use("/reviews", reviewsRoutes);
app.use("/", reviewEligibilityRoutes);

// ВАЖНО — без /api/projects
app.use('/', projectsRoutes);

const PORT = 5002;

app.listen(PORT, () => {
  console.log(`Projects Service running on port ${PORT}`);
});
