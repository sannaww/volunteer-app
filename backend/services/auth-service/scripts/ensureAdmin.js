const path = require("path");
const bcrypt = require("bcryptjs");
const prisma = require("../prismaClient");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
} catch (error) {
  // dotenv is optional when env vars are injected by container runtime
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value, fallback) {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

async function ensureAdmin() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = String(process.env.ADMIN_PASSWORD || "");
  const firstName = normalizeName(process.env.ADMIN_FIRST_NAME, "Admin");
  const lastName = normalizeName(process.env.ADMIN_LAST_NAME, "User");

  if (!email || !password) {
    console.log("[admin-bootstrap] ADMIN_EMAIL или ADMIN_PASSWORD не заданы, пропускаем.");
    return;
  }

  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD должен быть не короче 6 символов");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      isBlocked: true,
    },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "admin",
        isBlocked: false,
        emailVerified: true,
        emailVerificationToken: null,
      },
    });
    console.log(`[admin-bootstrap] Пользователь ${email} повышен до admin.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 14);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "admin",
      emailVerified: true,
      emailVerificationToken: null,
      isBlocked: false,
    },
  });

  console.log(`[admin-bootstrap] Создан admin ${email}.`);
}

ensureAdmin()
  .catch((error) => {
    console.error("[admin-bootstrap] Ошибка:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
