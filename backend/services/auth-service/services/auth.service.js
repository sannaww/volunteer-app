const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = 'your-secret-key';

/**
 * Регистрация пользователя
 */
async function registerUser(data) {
  const { email, password, firstName, lastName, role, contactInfo } = data;

  // Проверка обязательных полей
  if (!email || !password || !firstName || !lastName) {
    throw new Error('Все обязательные поля должны быть заполнены');
  }

  // Проверяем, существует ли пользователь
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('Пользователь с таким email уже существует');
  }

  // Проверка contactInfo (если есть)
  if (contactInfo) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo);
    const isPhone = /^\+7\d{10}$/.test(contactInfo.replace(/\s|\(|\)|-/g, ''));

    if (!isEmail && !isPhone) {
      throw new Error(
        'Контактная информация должна быть email или телефоном +79991234567'
      );
    }
  }

  // Хешируем пароль
  const hashedPassword = await bcrypt.hash(password, 14);

  // Создаём пользователя
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'volunteer',
      emailVerified: true,
      emailVerificationToken: null
    }
  });

  // Убираем пароль из ответа
  const { password: _, ...userWithoutPassword } = user;

  return userWithoutPassword;
}

/**
 * Логин пользователя
 */
async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error('Email и пароль обязательны');
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Пользователь не найден');
  }

  // ✅ ПРОВЕРКА БЛОКИРОВКИ
  if (user.isBlocked) {
    throw new Error('Ваш аккаунт заблокирован администратором');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Неверный пароль');
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token
  };
}

/**
 * Получить текущего пользователя по токену
 */
async function getMe(token) {
  if (!token) {
    throw new Error('Токен не предоставлен');
  }

  const decoded = jwt.verify(token, JWT_SECRET);

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
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
    throw new Error('Пользователь не найден');
  }

  return user;
}

async function updateProfile(token, data) {
  if (!token) throw new Error('Требуется авторизация');

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new Error('Недействительный токен');
  }

  const { firstName, lastName, phone, skills, interests, bio } = data;

  if (!firstName || !lastName) {
    throw new Error('Имя и фамилия обязательны');
  }

  const updated = await prisma.user.update({
    where: { id: decoded.userId },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone ? phone.trim() : null,
      skills: skills ? skills.trim() : null,
      interests: interests ? interests.trim() : null,
      bio: bio ? bio.trim() : null,
    },
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
      createdAt: true,
      isBlocked: true,
    },
  });

  return updated;
}

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile
};
