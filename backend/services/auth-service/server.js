const path = require("path");
const express = require('express');
const cors = require('cors');

try {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
} catch (error) {
  // dotenv is optional when env vars are injected by container runtime
}

const app = express();

app.use(cors());
app.use(express.json()); 

const authRoutes = require('./routes/auth.routes');
const internalPointsRoutes = require("./routes/internalPoints.routes");
app.use('/', authRoutes);
app.use("/internal", internalPointsRoutes);

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
