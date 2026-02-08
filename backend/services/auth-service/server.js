const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth.routes');

app.use('/', authRoutes);

app.listen(5001, () => {
  console.log('Auth Service running on port 5001');
});
