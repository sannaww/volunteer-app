const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Получить профиль
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        skills: true,
        interests: true,
        bio: true,
        avatarUrl: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
};

// Обновить профиль
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phone, skills, interests, bio } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone,
        skills,
        interests,
        bio
      }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
};
