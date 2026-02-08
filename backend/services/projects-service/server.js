const express = require('express');
const cors = require('cors');

const projectRoutes = require('./routes/project.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/projects', projectRoutes);

const PORT = 5002;

app.listen(PORT, () => {
  console.log(`Projects Service running on port ${PORT}`);
});
