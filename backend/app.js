const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// Пока оставляем как у тебя в сервисах (позже вынесем в .env)
const JWT_SECRET = "your-secret-key";

// Global middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// ВАЖНО: НЕ включаем парсинг body в gateway, иначе proxy может "съесть" тело
// app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "API is working 🚀" });
});

// Auth middleware
function attachAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    // пробрасываем данные дальше
    req.headers["x-user-id"] = String(decoded.userId);
    if (decoded.role) req.headers["x-user-role"] = String(decoded.role);

    return next();
  } catch (e) {
    return res.status(401).json({ error: "Недействительный токен" });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.user?.role || req.headers["x-user-role"];

    if (!role) return res.status(403).json({ error: "Роль не определена" });
    if (!allowedRoles.includes(role)) return res.status(403).json({ error: "Недостаточно прав" });

    return next();
  };
}

// helper: считаем write-методами POST/PUT/PATCH/DELETE
function isWriteMethod(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

/**
 * ✅ REVIEWS — ФИНАЛЬНОЕ РЕШЕНИЕ
 * Express "срезает" mount-path (/api/reviews) и в proxy часто приходит "/my".
 * Мы всегда отправляем в сервис полный req.originalUrl ("/api/reviews/my").
 */
app.use(
  "/api/reviews",
  attachAuth,
  requireRole(["volunteer", "admin"]),
  createProxyMiddleware({
    target: "http://localhost:5002",
    changeOrigin: true,

    // ⭐ вот ключ: всегда проксируем полный путь
    pathRewrite: (path, req) => req.originalUrl,

    onProxyReq: (proxyReq, req) => {
      console.log("[GATEWAY REVIEWS]", req.method, req.originalUrl, "=>", proxyReq.path);
    },
  })
);

// Proxy → Auth Service (5001)
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: "http://localhost:5001",
    changeOrigin: true,
    pathRewrite: { "^/api/auth": "" },
  })
);

// ✅ Proxy → Profile (Auth Service 5001)
app.use(
  "/api/profile",
  attachAuth,
  createProxyMiddleware({
    target: "http://localhost:5001",
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === "/" || path === "") return "/profile";
      return `/profile${path}`;
    },
  })
);

// Proxy → Projects Service (5002) + RBAC
app.use(
  "/api/projects",
  (req, res, next) => {
    const isFavoritesRoute = req.path === "/favorites" || req.path.startsWith("/favorites/");
    const isReviewsRoute = req.path === "/reviews" || req.path.startsWith("/reviews/");
    
    const isOrganizerCalendar = req.path.startsWith("/organizer/calendar");
    if (isOrganizerCalendar) return attachAuth(req, res, next);

    // favorites: всегда с токеном
    if (isFavoritesRoute) return attachAuth(req, res, next);

    // reviews: POST только с токеном
    if (isReviewsRoute && req.method === "POST") return attachAuth(req, res, next);

    // обычные GET — без токена
    if (!isWriteMethod(req.method)) return next();

    // write проекты — с токеном
    return attachAuth(req, res, next);
  },
  (req, res, next) => {
    const isFavoritesRoute = req.path === "/favorites" || req.path.startsWith("/favorites/");
    const isReviewsRoute = req.path === "/reviews" || req.path.startsWith("/reviews/");

    const isOrganizerCalendar = req.path.startsWith("/organizer/calendar");
    if (isOrganizerCalendar) return requireRole(["organizer", "admin"])(req, res, next);

    if (isFavoritesRoute) return requireRole(["volunteer", "admin"])(req, res, next);

    if (isReviewsRoute && req.method === "POST") {
      return requireRole(["volunteer", "admin"])(req, res, next);
    }

    if (!isWriteMethod(req.method)) return next();

    return requireRole(["organizer", "admin"])(req, res, next);
  },
  createProxyMiddleware({
    target: "http://localhost:5002",
    changeOrigin: true,
    pathRewrite: { "^/api/projects": "" },
  })
);

// Proxy → Applications Service (5003) + RBAC
app.use(
  "/api/applications",
  attachAuth,
  (req, res, next) => {
    if (req.method === "GET" && req.path === "/my") return next();
    if (req.method === "GET" && req.path.startsWith("/can-review/")) return next();

    if (req.method === "GET" && req.path.startsWith("/project/")) {
      return requireRole(["organizer", "admin"])(req, res, next);
    }

    if (req.method === "POST") {
      return requireRole(["volunteer", "admin"])(req, res, next);
    }

    return next();
  },
  createProxyMiddleware({
    target: "http://localhost:5003",
    changeOrigin: true,
    pathRewrite: { "^/api/applications": "" },
  })
);

// Proxy → Admin Service (5004) + RBAC
app.use(
  "/api/admin",
  attachAuth,
  requireRole(["admin"]),
  createProxyMiddleware({
    target: "http://localhost:5004",
    changeOrigin: true,
    pathRewrite: { "^/api/admin": "" },
  })
);

// Proxy → Messages (пока внутри applications-service 5003)
app.use(
  "/api/messages",
  attachAuth,
  createProxyMiddleware({
    target: "http://localhost:5003",
    changeOrigin: true,
    pathRewrite: (path) => `/messages${path}`,
  })
);

module.exports = app;
