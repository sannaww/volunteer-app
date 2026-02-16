require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const path = require("path");
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json()); 

const authRoutes = require('./routes/auth.routes');
const internalPointsRoutes = require("./routes/internalPoints.routes");
app.use('/', authRoutes);
app.use("/internal", internalPointsRoutes);

app.listen(5001, () => {
  console.log('Auth Service running on port 5001');
});
