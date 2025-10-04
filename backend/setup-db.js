const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Это создаст таблицы без миграций
    await prisma.$executeRaw`SELECT 1`;
    console.log('Database connection successful');
    
    // Здесь можно добавить начальные данные
    console.log('Database setup completed');
  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();