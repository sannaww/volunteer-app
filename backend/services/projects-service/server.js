const express = require('express');
const cors = require('cors');
const projectsRoutes = require('./routes/projects.routes');

const app = express();

app.use(cors());
app.use(express.json());

// ВАЖНО — без /api/projects
app.use('/', projectsRoutes);

const PORT = 5002;

app.listen(PORT, () => {
  console.log(`Projects Service running on port ${PORT}`);
});
