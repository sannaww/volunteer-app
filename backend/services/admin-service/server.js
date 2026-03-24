const path = require("path");
const express = require('express');
const cors = require('cors');

try {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
} catch (error) {
  // Локально читаем .env
}

const adminRoutes = require('./routes/admin.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/', adminRoutes);

const PORT = Number(process.env.PORT) || 5004;

app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});
