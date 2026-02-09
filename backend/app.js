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
// ВАЖНО: НЕ включаем парсинг body в gateway, иначе proxy может "съесть" тело
// app.use(express.json());

// ==================
// Health check
// ==================
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is working 🚀' });
});

// ==================
// Auth middleware
// ==================
function attachAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    // пробрасываем данные дальше
    req.headers['x-user-id'] = String(decoded.userId);
    if (decoded.role) req.headers['x-user-role'] = String(decoded.role);

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.user?.role || req.headers['x-user-role'];

    if (!role) {
      return res.status(403).json({ error: 'Роль не определена' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    return next();
  };
}

// helper: считаем write-методами POST/PUT/PATCH/DELETE
function isWriteMethod(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

// ==================
// Proxy → Auth Service (5001)
// ==================
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
  })
);

// ==================
// Proxy → Projects Service (5002) + RBAC
// ==================
// GET — всем
// POST/PUT/PATCH/DELETE — только organizer/admin
app.use(
  '/api/projects',
  (req, res, next) => {
    if (!isWriteMethod(req.method)) return next();        // GET без токена
    return attachAuth(req, res, next);                    // на write нужен токен
  },
  (req, res, next) => {
    if (!isWriteMethod(req.method)) return next();
    return requireRole(['organizer', 'admin'])(req, res, next);
  },
  createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: { '^/api/projects': '' },
  })
);

// ==================
// Proxy → Applications Service (5003) + RBAC
// ==================
// Все endpoints требуют токен.
// POST /:projectId — volunteer/admin
// GET /project/:projectId — organizer/admin
// GET /my — любой авторизованный
app.use(
  '/api/applications',
  attachAuth,
  (req, res, next) => {
    // req.path будет уже без "/api/applications" (но ДО pathRewrite), поэтому тут так:
    // Пример: /my, /project/2, /2
    if (req.method === 'GET' && req.path === '/my') {
      return next(); // любой авторизованный
    }

    if (req.method === 'GET' && req.path.startsWith('/project/')) {
      return requireRole(['organizer', 'admin'])(req, res, next);
    }

    if (req.method === 'POST') {
      return requireRole(['volunteer', 'admin'])(req, res, next);
    }

    // на остальные методы/пути пока просто пропускаем (можно ужесточить позже)
    return next();
  },
  createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: { '^/api/applications': '' },
  })
);

module.exports = app;
