const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Отправить сообщение
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user.userId;

    const message = await prisma.message.create({
      data: {
        text,
        senderId,
        receiverId: parseInt(receiverId)
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отправке сообщения' });
  }
};

// Получить переписку
exports.getConversation = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = parseInt(req.params.userId);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении переписки' });
  }
};

// Получить список диалогов
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении диалогов' });
  }
};
