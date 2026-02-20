const prisma = require("../prismaClient");

// Отправить сообщение
exports.sendMessage = async (req, res) => {
  try {
    const senderId = Number(req.headers["x-user-id"] || req.user?.userId);
    const { receiverId, text } = req.body;

    if (!senderId) return res.status(401).json({ message: "No sender id" });
    if (!receiverId || !String(text || "").trim()) {
      return res.status(400).json({ message: "receiverId и text обязательны" });
    }

    const message = await prisma.message.create({
      data: {
        text: String(text).trim(),
        senderId,
        receiverId: Number(receiverId),
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ error: "Ошибка при отправке сообщения" });
  }
};

// Получить переписку
exports.getConversation = async (req, res) => {
  try {
    const currentUserId = Number(req.headers["x-user-id"] || req.user?.userId);
    const otherUserId = Number(req.params.userId);

    if (!currentUserId) return res.status(401).json({ message: "No user id" });
    if (!otherUserId) return res.status(400).json({ message: "userId required" });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (error) {
    console.error("getConversation error:", error);
    res.status(500).json({ error: "Ошибка при получении переписки" });
  }
};

// Получить список диалогов (последние сообщения)
exports.getConversations = async (req, res) => {
  try {
    const userId = Number(req.headers["x-user-id"] || req.user?.userId);
    if (!userId) return res.status(401).json({ message: "No user id" });

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
    });

    res.json(messages);
  } catch (error) {
    console.error("getConversations error:", error);
    res.status(500).json({ error: "Ошибка при получении диалогов" });
  }
};

// Поиск по сообщениям в конкретном диалоге
// GET /messages/conversation/:partnerId/search?q=...&limit=20&cursor=123
exports.searchInConversation = async (req, res) => {
  try {
    const userId = Number(req.headers["x-user-id"] || req.user?.userId);
    const partnerId = Number(req.params.partnerId);
    const q = String(req.query.q || "").trim();

    if (!userId) return res.status(401).json({ message: "No user id" });
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
  } catch (error) {
    console.error("searchInConversation error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Jump-to-message: вокруг сообщения
// GET /messages/conversation/:partnerId/around/:messageId?before=30&after=30
exports.getAroundMessage = async (req, res) => {
  try {
    const userId = Number(req.headers["x-user-id"] || req.user?.userId);
    const partnerId = Number(req.params.partnerId);
    const messageId = Number(req.params.messageId);

    if (!userId) return res.status(401).json({ message: "No user id" });
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
  } catch (error) {
    console.error("getAroundMessage error:", error);
    res.status(500).json({ message: "Server error" });
  }
};