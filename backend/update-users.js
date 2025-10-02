const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateExistingUsers() {
  try {
    // Обновляем всех существующих пользователей
    const result = await prisma.user.updateMany({
      data: {
        emailVerified: true,
        emailVerificationToken: null
      }
    });

    console.log(`✅ Обновлено ${result.count} пользователей`);
    console.log('Теперь все пользователи могут входить без подтверждения email');
  } catch (error) {
    console.error('❌ Ошибка при обновлении пользователей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingUsers();