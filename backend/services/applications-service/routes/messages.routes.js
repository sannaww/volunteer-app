const express = require('express');
const router = express.Router();

// ⚠️ ВРЕМЕННОЕ хранилище в памяти (для проверки маршрутов)
// После проверки мы перенесём в Prisma/PostgreSQL.
let messages = [];
let idSeq = 1;

// GET /messages/conversations
router.get('/conversations', (req, res) => {
  const userId = Number(req.headers['x-user-id']);
  if (!userId) return res.status(401).json({ message: 'No x-user-id header' });

  // Последние сообщения по каждому собеседнику
  const lastByPartner = new Map();

  const relevant = messages
    .filter(m => m.senderId === userId || m.receiverId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  for (const m of relevant) {
    const partnerId = m.senderId === userId ? m.receiverId : m.senderId;
    if (!lastByPartner.has(partnerId)) {
      lastByPartner.set(partnerId, {
        user: {
          id: partnerId,
          // временно: фронт пусть переживёт отсутствие ФИО
          firstName: 'User',
          lastName: `#${partnerId}`,
          role: 'unknown'
        },
        lastMessage: { text: m.text, createdAt: m.createdAt },
        unreadCount: 0
      });
    }
  }

  res.json(Array.from(lastByPartner.values()));
});

// GET /messages/conversation/:partnerId
router.get('/conversation/:partnerId', (req, res) => {
  const userId = Number(req.headers['x-user-id']);
  const partnerId = Number(req.params.partnerId);
  if (!userId) return res.status(401).json({ message: 'No x-user-id header' });

  const convo = messages
    .filter(m =>
      (m.senderId === userId && m.receiverId === partnerId) ||
      (m.senderId === partnerId && m.receiverId === userId)
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json(convo);
});

// POST /messages
router.post('/', (req, res) => {
  const senderId = Number(req.headers['x-user-id']);
  if (!senderId) return res.status(401).json({ message: 'No x-user-id header' });

  const { receiverId, text } = req.body;

  if (!receiverId || !text || !text.trim()) {
    return res.status(400).json({ message: 'receiverId и text обязательны' });
  }

  const msg = {
    id: idSeq++,
    senderId,
    receiverId: Number(receiverId),
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  messages.push(msg);
  res.status(201).json(msg);
});

module.exports = router;
