require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
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

const app = express();

// CORS для HTTP
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// HTTP routes
app.use("/messages", messagesRoutes);
app.use("/", applicationsRoutes);
app.use("/internal", internalRoutes);
app.use("/", reviewEligibilityRoutes);

// --- создаём HTTP server, чтобы Socket.IO работал на том же порту ---
const server = http.createServer(app);

// JWT secret (ДОЛЖЕН совпадать с auth-service/gateway)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Socket.IO сервер
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

/**
 * ✅ Утилита: пересчитать общее кол-во непрочитанных и отправить пользователю.
 * Navbar слушает событие `unread:count` и мгновенно убирает/ставит кружок.
 */
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

// WS JWT-auth
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));

    const decoded = jwt.verify(token, JWT_SECRET);

    // ожидаем userId и role в токене
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

  // личная комната пользователя
  socket.join(`user:${userId}`);
  console.log(`[WS] connected user:${userId}`);

  // При коннекте сразу отдадим актуальный total unread (чтобы Navbar синхронизировался)
  emitUnreadCount(userId);

  // ✅ при подключении пользователя — отмечаем все недоставленные как доставленные
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

      // уведомим отправителей
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

  /**
   * ✅ Отметить диалог как прочитанный (readAt).
   * payload: { partnerId: number }
   * - Ставит readAt у всех сообщений partner -> me, где readAt == null
   * - Отправляет partner событие `messages:read` (для ✓✓ у отправителя)
   * - Отправляет me событие `unread:count` (для мгновенного обновления кружка в Navbar)
   */
  socket.on("conversation:read", async (payload) => {
    try {
      const readerId = userId; // кто читает
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
        // даже если нечего читать — всё равно синхронизируем Navbar
        await emitUnreadCount(readerId);
        return;
      }

      const ids = toRead.map((m) => m.id);

      await prisma.message.updateMany({
        where: { id: { in: ids } },
        data: { readAt: now },
      });

      // уведомляем отправителя (партнёра), чтобы у него стало ✓✓
      io.to(`user:${partnerId}`).emit("messages:read", {
        messageIds: ids,
        readAt: now.toISOString(),
        readerId,
      });

      // уведомляем читателя, чтобы мгновенно убрать кружок
      await emitUnreadCount(readerId);
    } catch (e) {
      console.error("[WS] conversation:read error", e);
    }
  });

  /**
   * Отправка сообщения в real-time
   * payload: { receiverId: number, text: string }
   */
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

      // ✅ сохраняем в БД
      const msg = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          text,
        },
      });

      // ✅ как в твоём HTTP: добавляем senderRole
      const dto = { ...msg, senderRole };

      // получателю
      io.to(`user:${receiverId}`).emit("message:new", dto);

      // отправителю подтверждение
      socket.emit("message:sent", dto);

      // ✅ мгновенно обновим кружок у получателя (без лишнего GET /conversations)
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

// слушаем тот же порт
server.listen(5003, () => {
  console.log("Applications Service (HTTP+WS) running on port 5003");
});