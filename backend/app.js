const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Пока оставляем как у тебя в сервисах (позже вынесем в .env)
const JWT_SECRET = 'your-secret-key';

// Global middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
// ВАЖНО: НЕ включаем парсинг body в gateway, иначе proxy может "съесть" тело
// app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is working 🚀' });
});

// Auth middleware
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

// Proxy → Auth Service (5001)
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
  })
);

// ✅ Proxy → Profile (Auth Service 5001)
app.use(
  '/api/profile',
  attachAuth, // профиль всегда требует токен
  createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // когда запрос приходит на /api/profile, path здесь будет "/"
      // нужно отправить его в auth-service как "/profile"
      if (path === '/' || path === '') return '/profile';
      return `/profile${path}`; // на будущее, если будут /api/profile/что-то
    },
  })
);

// Proxy → Projects Service (5002) + RBAC
// GET проектов — всем, favorites — только volunteer/admin (и всегда с токеном)
// остальные write-методы — organizer/admin
app.use(
  '/api/projects',
  (req, res, next) => {
    // req.path здесь УЖЕ без "/api/projects"
    // например: "/favorites", "/favorites/12", "/1", "/"
    const isFavoritesRoute = req.path === '/favorites' || req.path.startsWith('/favorites/');

    // favorites всегда требуют токен (и GET тоже)
    if (isFavoritesRoute) {
      return attachAuth(req, res, next);
    }
    // обычные GET — без токена
    if (!isWriteMethod(req.method)) return next();
    // write-методы (создание/редактирование проектов) — с токеном
    return attachAuth(req, res, next);
  },
  (req, res, next) => {
    const isFavoritesRoute = req.path === '/favorites' || req.path.startsWith('/favorites/');

    if (isFavoritesRoute) {
      // избранное — только волонтёр и админ
      return requireRole(['volunteer', 'admin'])(req, res, next);
    }

    // на обычные GET не накладываем роли
    if (!isWriteMethod(req.method)) return next();

    // создание/редактирование проектов — organizer/admin
    return requireRole(['organizer', 'admin'])(req, res, next);
  },
  createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: { '^/api/projects': '' },
  })
);


// Proxy → Applications Service (5003) + RBAC
// Все endpoints требуют токен.
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

// Proxy → Admin Service (5004) + RBAC
app.use(
  '/api/admin',
  attachAuth,
  requireRole(['admin']),
  createProxyMiddleware({
    target: 'http://localhost:5004',
    changeOrigin: true,
    pathRewrite: { '^/api/admin': '' },
  })
);

// Proxy → Messages (пока внутри applications-service 5003)
app.use(
  '/api/messages',
  attachAuth,
  createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // path здесь будет "/conversations", "/conversation/5", "/" и т.п.
      return `/messages${path}`;
    },
  })
);

module.exports = app;
