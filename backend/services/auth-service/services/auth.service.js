const prisma = require("../prismaClient");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "your-secret-key";

// helpers
function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function normalizeName(v) {
  const s = String(v || "").trim();
  return s.length ? s : null;
}

function normalizeRole(v) {
  const role = String(v || "volunteer").trim().toLowerCase();
  return role;
}

function normalizePhone(v) {
  // оставляем только цифры и плюс
  const raw = String(v || "").trim();
  const cleaned = raw.replace(/[^\d+]/g, ""); // убираем пробелы, скобки, дефисы
  return cleaned;
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function isValidRuPhonePlus7(v) {
  const phone = normalizePhone(v);
  return /^\+7\d{10}$/.test(phone);
}

// Регистрация пользователя
async function registerUser(data) {
  // принимаем и camelCase, и варианты из Postman
  const email = normalizeEmail(data.email);
  const password = data.password;

  const firstName =
    normalizeName(data.firstName) ?? normalizeName(data.firstname) ?? normalizeName(data.first_name);
  const lastName =
    normalizeName(data.lastName) ?? normalizeName(data.lastname) ?? normalizeName(data.last_name);

  const role = normalizeRole(data.role);
  const contactInfo = data.contactInfo ?? data.contact ?? data.phone ?? null;

  // Проверка обязательных полей
  if (!email || !password || !firstName || !lastName) {
    throw new Error("Все обязательные поля должны быть заполнены");
  }

  // запрет регистрации админа публично
  if (role === "admin") {
    throw new Error("Нельзя зарегистрировать администратора через форму регистрации");
  }

  // можно разрешить только эти роли
  if (!["volunteer", "organizer"].includes(role)) {
    throw new Error("Некорректная роль. Разрешены: volunteer, organizer");
  }

  // Проверяем, существует ли пользователь
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Пользователь с таким email уже существует");
  }

  // Проверка contactInfo (если есть)
  if (contactInfo) {
    const ci = String(contactInfo).trim();
    const ok = isValidEmail(ci) || isValidRuPhonePlus7(ci);
    if (!ok) {
      throw new Error("Контактная информация должна быть email или телефоном +79991234567");
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
      role, // уже нормализованная
      emailVerified: true,
      emailVerificationToken: null,
      // если в Prisma есть phone и хочешь сохранить телефон из contactInfo:
      // phone: isValidRuPhonePlus7(contactInfo) ? normalizePhone(contactInfo) : null,
    },
  });

  // Убираем пароль из ответа
  const { password: _pwd, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Логин пользователя
async function loginUser(email, password) {
  const emailNorm = normalizeEmail(email);

  if (!emailNorm || !password) {
    throw new Error("Email и пароль обязательны");
  }

  const user = await prisma.user.findUnique({
    where: { email: emailNorm },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  // ✅ ПРОВЕРКА БЛОКИРОВКИ
  if (user.isBlocked) {
    throw new Error("Ваш аккаунт заблокирован администратором");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Неверный пароль");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  const { password: _pwd, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

// Получить текущего пользователя по токену
async function getMe(token) {
  if (!token) {
    throw new Error("Токен не предоставлен");
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
      createdAt: true,
      points: true,
    },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  return user;
}

async function updateProfile(token, data) {
  if (!token) throw new Error("Требуется авторизация");

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new Error("Недействительный токен");
  }

  const { firstName, lastName, phone, skills, interests, bio } = data;

  if (!firstName || !lastName) {
    throw new Error("Имя и фамилия обязательны");
  }

  const updated = await prisma.user.update({
    where: { id: decoded.userId },
    data: {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phone: phone ? String(phone).trim() : null,
      skills: skills ? String(skills).trim() : null,
      interests: interests ? String(interests).trim() : null,
      bio: bio ? String(bio).trim() : null,
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

async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });
}
async function deleteAccount(token) {
  if (!token) throw new Error("Требуется авторизация");

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new Error("Недействительный токен");
  }

  // важно: удаляем по id из токена
  const userId = decoded.userId;

  // если у тебя есть зависимости (favorites/reviews/applications) — лучше делать soft delete.
  // но для диплома можно удалить user, если FK позволяют.

  await prisma.user.delete({ where: { id: userId } });

  return { message: "Аккаунт удалён" };
}

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  getUserById,
  deleteAccount,
};
