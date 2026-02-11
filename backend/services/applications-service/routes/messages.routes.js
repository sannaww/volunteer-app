const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// Вспомогательно: безопасное имя роли для UI
function normalizeRole(role) {
  if (!role) return 'unknown';
  return String(role).toLowerCase();
}

// GET /messages/conversations
router.get('/conversations', async (req, res) => {
  const userId = Number(req.headers['x-user-id']);
  if (!userId) return res.status(401).json({ message: 'No x-user-id header' });

  // Берём последние сообщения пользователя (sender/receiver)
  // и на их основе строим список диалогов.
  const lastMessages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const map = new Map();

  for (const m of lastMessages) {
    const partnerId = m.senderId === userId ? m.receiverId : m.senderId;

    if (!map.has(partnerId)) {
      map.set(partnerId, {
        user: {
          id: partnerId,
          // Имя/роль подтянем позже (Часть B)
          firstName: null,
          lastName: null,
          role: 'unknown',
        },
        lastMessage: {
          text: m.text,
          createdAt: m.createdAt,
        },
        unreadCount: 0,
      });
    }
  }

  res.json(Array.from(map.values()));
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

  // В ответ можно вернуть role отправителя, чтобы UI мог красиво отрисовать (не обязательно)
  res.status(201).json({
    ...msg,
    senderRole,
  });
});

module.exports = router;
