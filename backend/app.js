const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Пока оставляем как у тебя в сервисах (позже вынесем в .env)
const JWT_SECRET = 'your-secret-key';

// ==================
// Global middleware
// ==================
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
//app.use(express.json());

// ==================
// Health check
// ==================
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is working 🚀' });
});

// ==================
// Auth check (only for write methods)
// ==================
function requireAuthForWrite(req, res, next) {
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isWrite) return next();

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // сохраним пользователя в req (может пригодиться позже)
    req.user = decoded;

    // пробросим user info в микросервисы заголовками
    req.headers['x-user-id'] = String(decoded.userId);
    if (decoded.role) req.headers['x-user-role'] = String(decoded.role);

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

// ==================
// Proxy → Auth Service (5001)
// ==================
// auth-service маршруты: POST /login, POST /register
// поэтому переписываем: /api/auth/login -> /login
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
  })
);

// ==================
// Proxy → Projects Service (5002)
// ==================
// projects-service маршруты висят на '/':
// GET /, GET /:id, POST /
// поэтому переписываем: /api/projects -> /
app.use(
  '/api/projects',
  requireAuthForWrite,
  createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: { '^/api/projects': '' },
  })
);

// Proxy → Applications Service (5003)
app.use(
  '/api/applications',
  requireAuthForWrite, // проверка токена для POST/PUT/DELETE
  createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: { '^/api/applications': '' },
  })
);



module.exports = app;
