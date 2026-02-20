const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const axios = require('axios');
// --- helpers ---
function normalizeRole(role) {
  if (!role) return 'unknown';
  return String(role).toLowerCase();
}
// Простейший in-memory cache пользователей (дипломно: снижает нагрузку)
// key: userId -> { value, expiresAt }
const userCache = new Map();
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут
async function getUserPublicById(userId, token) {
  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  // Важно: мы обращаемся к auth-service через gateway,
  // чтобы сохранить единые правила и не знать портов напрямую.
  // Gateway ждёт /api/auth/users/:id
  const resp = await axios.get(`http://localhost:5000/api/auth/users/${userId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const value = resp.data;
  userCache.set(userId, { value, expiresAt: now + USER_CACHE_TTL_MS });
  return value;
}
function safeUserFallback(userId) {
  return { id: userId, firstName: null, lastName: null, role: 'unknown' };
}
function getBearerToken(req) {
  return req.headers.authorization?.split(' ')[1] || null;
}
// --- routes ---
// GET /messages/conversations
router.get('/conversations', async (req, res) => {
  const userId = Number(req.headers['x-user-id']);
  if (!userId) return res.status(401).json({ message: 'No x-user-id header' });
  const token = getBearerToken(req); // прокинутый gateway токен
  const lastMessages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  // partnerId -> conversation skeleton
  const map = new Map();
  for (const m of lastMessages) {
    const partnerId = m.senderId === userId ? m.receiverId : m.senderId;
    if (!map.has(partnerId)) {
      map.set(partnerId, {
        user: safeUserFallback(partnerId),
        lastMessage: {
  id: m.id,
  text: m.text,
  createdAt: m.createdAt,
  senderId: m.senderId,
  receiverId: m.receiverId,
  deliveredAt: m.deliveredAt,
  readAt: m.readAt,
},
        unreadCount: 0,
      });
    }
  }
  const partnerIds = Array.from(map.keys());
    // ✅ считаем непрочитанные: сообщения -> МНЕ (receiverId=userId), ещё не прочитаны (readAt=null)
  const unreadGrouped = await prisma.message.groupBy({
    by: ["senderId"],
    where: {
      receiverId: userId,
      readAt: null,
      senderId: { in: partnerIds },
    },
    _count: { _all: true },
  });
  const unreadByPartner = new Map(
    unreadGrouped.map((row) => [row.senderId, row._count._all])
  );
  // проставим в map
  for (const pid of partnerIds) {
    const conv = map.get(pid);
    if (conv) conv.unreadCount = unreadByPartner.get(pid) || 0;
  }
  // подтягиваем пользователей параллельно
  const users = await Promise.all(
    partnerIds.map(async (pid) => {
      try {
        return await getUserPublicById(pid, token);
      } catch (e) {
        // auth-service может быть недоступен — чат всё равно работает
        return safeUserFallback(pid);
      }
    })
  );
  const userById = new Map(users.map((u) => [u.id, u]));
  const result = partnerIds.map((pid) => {
    const conv = map.get(pid);
    const u = userById.get(pid) || safeUserFallback(pid);
    return {
      ...conv,
      user: {
        id: pid,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        role: normalizeRole(u.role),
      },
    };
  });
  res.json(result);
});
// GET /messages/conversation/:partnerId
router.get('/conversation/:partnerId', async (req, res) => {
  const userId = Number(req.headers['x-user-id']);
  const partnerId = Number(req.params.partnerId);
  if (!userId) return res.status(401).json({ message: 'No x-user-id header' });
  const msgs = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(msgs);
});// GET /messages/conversation/:partnerId/search?q=...&limit=20&cursor=123
// Поиск по истории сообщений в рамках конкретного диалога
router.get("/conversation/:partnerId/search", async (req, res) => {
  try {
    const userId = Number(req.headers["x-user-id"]);
    const partnerId = Number(req.params.partnerId);
    const q = String(req.query.q || "").trim();

    if (!userId) return res.status(401).json({ message: "No x-user-id header" });
    if (!partnerId) return res.status(400).json({ message: "partnerId required" });
    if (!q) return res.status(400).json({ message: "q required" });

    const limitRaw = Number(req.query.limit ?? 20);
    const limit = Math.min(Math.max(limitRaw, 1), 50);

    const cursorRaw = req.query.cursor;
    const cursorId = cursorRaw != null && cursorRaw !== "" ? Number(cursorRaw) : null;

    const where = {
      AND: [
        {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
        },
        { text: { contains: q, mode: "insensitive" } },
      ],
    };

    const total = await prisma.message.count({ where });

    const queryArgs = {
      where,
      orderBy: { id: "asc" },
      take: limit + 1,
    };

    if (cursorId && Number.isFinite(cursorId)) {
      queryArgs.cursor = { id: cursorId };
      queryArgs.skip = 1;
    }

    const rows = await prisma.message.findMany(queryArgs);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    res.json({ items, hasMore, nextCursor, total });
  } catch (e) {
    console.error("GET /messages/conversation/:partnerId/search error", e);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /messages/conversation/:partnerId/around/:messageId?before=30&after=30
// Возвращает кусок истории вокруг конкретного сообщения (jump-to-message)
router.get("/conversation/:partnerId/around/:messageId", async (req, res) => {
  try {
    const userId = Number(req.headers["x-user-id"]);
    const partnerId = Number(req.params.partnerId);
    const messageId = Number(req.params.messageId);

    if (!userId) return res.status(401).json({ message: "No x-user-id header" });
    if (!partnerId) return res.status(400).json({ message: "partnerId required" });
    if (!messageId) return res.status(400).json({ message: "messageId required" });

    const before = Math.min(Math.max(Number(req.query.before ?? 30), 0), 100);
    const after = Math.min(Math.max(Number(req.query.after ?? 30), 0), 100);

    const convWhere = {
      OR: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
    };

    const target = await prisma.message.findFirst({
      where: { id: messageId, ...convWhere },
    });

    if (!target) return res.status(404).json({ message: "Message not found" });

    const beforeMsgs = await prisma.message.findMany({
      where: { ...convWhere, id: { lt: messageId } },
      orderBy: { id: "desc" },
      take: before,
    });

    const afterMsgs = await prisma.message.findMany({
      where: { ...convWhere, id: { gt: messageId } },
      orderBy: { id: "asc" },
      take: after,
    });

    const items = [...beforeMsgs.reverse(), target, ...afterMsgs];

    res.json({ items, targetId: target.id });
  } catch (e) {
    console.error("GET /messages/conversation/:partnerId/around/:messageId error", e);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /messages
router.post('/', async (req, res) => {
  const senderId = Number(req.headers['x-user-id']);
  const senderRole = normalizeRole(req.headers['x-user-role']);
  if (!senderId) return res.status(401).json({ message: 'No x-user-id header' });
  const { receiverId, text } = req.body;
  if (!receiverId || !text?.trim()) {
    return res.status(400).json({ message: 'receiverId и text обязательны' });
  }
  const msg = await prisma.message.create({
    data: {
      senderId,
      receiverId: Number(receiverId),
      text: text.trim(),
    },
  });
  res.status(201).json({ ...msg, senderRole });
});
// DELETE /messages/conversation/:partnerId
// Удаляет весь диалог (все сообщения между userId и partnerId)
router.delete("/conversation/:partnerId", async (req, res) => {
  try {
    const userId = Number(req.headers["x-user-id"]);
    const partnerId = Number(req.params.partnerId);
    if (!userId) return res.status(401).json({ message: "No x-user-id header" });
    if (!partnerId) return res.status(400).json({ message: "partnerId required" });
    const result = await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
    });
    res.json({ deleted: result.count });
  } catch (e) {
    console.error("DELETE /messages/conversation/:partnerId error", e);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;