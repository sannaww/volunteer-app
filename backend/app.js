const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5001";
const PROJECTS_SERVICE_URL = process.env.PROJECTS_SERVICE_URL || "http://localhost:5002";
const APPLICATIONS_SERVICE_URL = process.env.APPLICATIONS_SERVICE_URL || "http://localhost:5003";
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || "http://localhost:5004";
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// CORS
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

// Без express.json() proxy может потерять body
// app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "API is working 🚀" });
});

// JWT
function attachAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    // Пробрасываем пользователя дальше
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

// Методы с записью
function isWriteMethod(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

// Отзывы
app.use(
  "/api/reviews",
  attachAuth,
  requireRole(["volunteer", "admin"]),
  createProxyMiddleware({
    target: PROJECTS_SERVICE_URL,
    changeOrigin: true,

    // Оставляем исходный путь
    pathRewrite: (path, req) => req.originalUrl,

    onProxyReq: (proxyReq, req) => {
      console.log("[GATEWAY REVIEWS]", req.method, req.originalUrl, "=>", proxyReq.path);
    },
  })
);

// Auth service
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/auth": "" },
  })
);

// Профиль
app.use(
  "/api/profile",
  attachAuth,
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === "/" || path === "") return "/profile";
      return `/profile${path}`;
    },
  })
);

// Projects service
app.use(
  "/api/projects",
  (req, res, next) => {
    const isFavoritesRoute = req.path === "/favorites" || req.path.startsWith("/favorites/");
    const isReviewsRoute = req.path === "/reviews" || req.path.startsWith("/reviews/");

    const isOrganizerCalendar = req.path.startsWith("/organizer/calendar");
    if (isOrganizerCalendar) return attachAuth(req, res, next);

    if (req.path.startsWith("/organizer")) return attachAuth(req, res, next);

    // Избранное всегда с токеном
    if (isFavoritesRoute) return attachAuth(req, res, next);

    // /reviews/my требует токен
    const isReviewsMy = req.path === "/reviews/my";
    if (isReviewsMy) return attachAuth(req, res, next);

    // Запись отзывов только с токеном
    if (isReviewsRoute && ["POST", "PUT", "DELETE"].includes(req.method)) {
      return attachAuth(req, res, next);
    }

    // Обычные GET без токена
    if (!isWriteMethod(req.method)) return next();

    // Изменение проектов только с токеном
    return attachAuth(req, res, next);
  },
  (req, res, next) => {
    const isFavoritesRoute = req.path === "/favorites" || req.path.startsWith("/favorites/");
    const isReviewsRoute = req.path === "/reviews" || req.path.startsWith("/reviews/");

    const isOrganizerCalendar = req.path.startsWith("/organizer/calendar");
    if (isOrganizerCalendar) return requireRole(["organizer", "admin"])(req, res, next);

    const isOrganizerProjects = req.path === "/organizer" || req.path.startsWith("/organizer/");
    if (isOrganizerProjects) return requireRole(["organizer", "admin"])(req, res, next);

    if (isFavoritesRoute) return requireRole(["volunteer", "admin"])(req, res, next);

    const isReviewsMy = req.path === "/reviews/my";
    if (isReviewsMy) return requireRole(["volunteer", "admin"])(req, res, next);

    // Изменение отзывов
    if (isReviewsRoute && ["PUT", "DELETE"].includes(req.method)) {
      return requireRole(["volunteer", "admin"])(req, res, next);
    }

    if (isReviewsRoute && req.method === "POST") {
      return requireRole(["volunteer", "admin"])(req, res, next);
    }

    if (!isWriteMethod(req.method)) return next();

    return requireRole(["organizer", "admin"])(req, res, next);
  },
  createProxyMiddleware({
    target: PROJECTS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/projects": "" },
  })
);

// Applications service
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
    target: APPLICATIONS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/applications": "" },
  })
);

// Admin service
app.use(
  "/api/admin",
  attachAuth,
  requireRole(["admin"]),
  createProxyMiddleware({
    target: ADMIN_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/admin": "" },
  })
);

// Сообщения
app.use(
  "/api/messages",
  attachAuth,
  createProxyMiddleware({
    target: APPLICATIONS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/messages${path}`,
  })
);

// Socket.IO
const socketIoProxy = createProxyMiddleware({
  target: APPLICATIONS_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  pathRewrite: (path, req) => req.originalUrl,
});

app.use("/socket.io", socketIoProxy);

app.socketIoProxy = socketIoProxy;

module.exports = app;
