const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");

const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const prisma = require("./prismaClient");

const applicationsRoutes = require("./routes/applications.routes");
const messagesRoutes = require("./routes/messages.routes");
const internalRoutes = require("./routes/internal.routes");
const reviewEligibilityRoutes = require("./routes/reviewEligibility.routes");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
} catch (error) {
  // Локально читаем .env
}

const app = express();
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
app.use(express.json());

// Роуты
app.use("/messages", messagesRoutes);
app.use("/", applicationsRoutes);
app.use("/internal", internalRoutes);
app.use("/", reviewEligibilityRoutes);

// HTTP-сервер для Socket.IO
const server = http.createServer(app);

// JWT для сокетов
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
});

// Считаем общее число непрочитанных
async function emitUnreadCount(userId) {
  try {
    const total = await prisma.message.count({
      where: { receiverId: userId, readAt: null },
    });
    io.to(`user:${userId}`).emit("unread:count", { total });
  } catch (e) {
    console.error("[WS] emitUnreadCount error", e);
  }
}

// Проверка токена сокета
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));

    const decoded = jwt.verify(token, JWT_SECRET);

    socket.user = {
      userId: Number(decoded.userId),
      role: decoded.role ? String(decoded.role).toLowerCase() : "unknown",
    };

    return next();
  } catch (e) {
    return next(new Error("BAD_TOKEN"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user.userId;

  // Комната пользователя
  socket.join(`user:${userId}`);
  console.log(`[WS] connected user:${userId}`);

  // Сразу отправляем unread count
  emitUnreadCount(userId);

  // Отмечаем доставленные сообщения
  (async () => {
    try {
      const undelivered = await prisma.message.findMany({
        where: { receiverId: userId, deliveredAt: null },
        select: { id: true, senderId: true },
      });

      if (!undelivered.length) return;

      const now = new Date();

      await prisma.message.updateMany({
        where: { id: { in: undelivered.map((m) => m.id) } },
        data: { deliveredAt: now },
      });

      // Сообщаем отправителям
      for (const m of undelivered) {
        io.to(`user:${m.senderId}`).emit("message:delivered", {
          messageId: m.id,
          deliveredAt: now.toISOString(),
        });
      }
    } catch (e) {
      console.error("[WS] mark delivered on connect error", e);
    }
  })();

  // Отмечаем диалог прочитанным
  socket.on("conversation:read", async (payload) => {
    try {
      const readerId = userId;
      const partnerId = Number(payload?.partnerId);
      if (!partnerId) return;

      const now = new Date();

      const toRead = await prisma.message.findMany({
        where: {
          senderId: partnerId,
          receiverId: readerId,
          readAt: null,
        },
        select: { id: true },
      });

      if (!toRead.length) {
        // Обновляем счётчик даже без новых сообщений
        await emitUnreadCount(readerId);
        return;
      }

      const ids = toRead.map((m) => m.id);

      await prisma.message.updateMany({
        where: { id: { in: ids } },
        data: { readAt: now },
      });

      // Сообщаем отправителю
      io.to(`user:${partnerId}`).emit("messages:read", {
        messageIds: ids,
        readAt: now.toISOString(),
        readerId,
      });

      // Обновляем счётчик читателя
      await emitUnreadCount(readerId);
    } catch (e) {
      console.error("[WS] conversation:read error", e);
    }
  });

  // Отправка сообщения
  socket.on("message:send", async (payload) => {
    try {
      const senderId = userId;
      const senderRole = socket.user.role;

      const receiverId = Number(payload?.receiverId);
      const text = String(payload?.text || "").trim();

      if (!receiverId || !text) {
        socket.emit("message:error", {
          error: "receiverId и text обязательны",
        });
        return;
      }

      // Сохраняем сообщение
      const msg = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          text,
        },
      });

      // Добавляем роль отправителя
      const dto = { ...msg, senderRole };

      // Получателю
      io.to(`user:${receiverId}`).emit("message:new", dto);

      // Подтверждение отправителю
      socket.emit("message:sent", dto);

      // Обновляем счётчик получателя
      await emitUnreadCount(receiverId);
    } catch (err) {
      console.error("[WS] message:send error", err);
      socket.emit("message:error", { error: "Ошибка отправки" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[WS] disconnected user:${userId}`);
  });
});

const PORT = Number(process.env.PORT) || 5003;

server.listen(PORT, () => {
  console.log(`Applications Service (HTTP+WS) running on port ${PORT}`);
});
