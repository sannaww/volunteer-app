const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// ==================
// Middleware
// ==================
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// ==================
// Proxy services
// ==================

// Auth Service (5001)
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
  })
);

// Projects Service (5002)
app.use(
  '/api/projects',
  createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
  })
);

// ==================
// Health check
// ==================
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is working 🚀' });
});

module.exports = app;
