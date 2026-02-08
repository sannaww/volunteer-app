const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authMiddleware = require('./middlewares/auth.middleware');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is working 🚀' });
});

// Proxy → Auth Service (5001)
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': '/api/auth'
    }
  })
);

// Proxy → Projects Service (5002)
app.use(
  '/api/projects',
  createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: {
      '^/api/projects': '/api/projects'
    }
  })
);


module.exports = app;
