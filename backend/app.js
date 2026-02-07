const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/projects.routes');
const applicationRoutes = require('./routes/applications.routes');
const userRoutes = require('./routes/users.routes');

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
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);

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