const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/projects.routes');

const app = express();

// ==================
// Middleware
// ==================
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================
// Routes
// ==================
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// ==================
// Test Route
// ==================
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is working 🚀' });
});

module.exports = app;