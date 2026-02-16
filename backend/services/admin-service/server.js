require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const path = require("path");
const express = require('express');
const cors = require('cors');

const adminRoutes = require('./routes/admin.routes');

const app = express();
app.use(cors());
app.use(express.json());

// Маршруты на корне
app.use('/', adminRoutes);

app.listen(5004, () => {
  console.log('Admin Service running on port 5004');
});
