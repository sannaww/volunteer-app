const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Начинаем создание тестовых данных...');

  // Очищаем существующие данные (начинаем с чистого листа)
  await prisma.application.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Старые данные очищены');

  // Создаем тестового организатора
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@example.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Иван',
      lastName: 'Петров',
      role: 'organizer',
      emailVerified: true,
      emailVerificationToken: null
    },
  });

  console.log('✅ Организатор создан:', organizer.email);

  // Создаем тестового волонтера
  const volunteer = await prisma.user.create({
    data: {
      email: 'volunteer@example.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Мария',
      lastName: 'Сидорова',
      role: 'volunteer',
      emailVerified: true,
      emailVerificationToken: null
    },
  });

  console.log('✅ Волонтер создан:', volunteer.email);

  // Создаем разнообразные тестовые проекты
  const projects = await Promise.all([
    // Экологический проект
    prisma.project.create({
      data: {
        title: 'Уборка городского парка',
        description: 'Субботник в центральном парке. Приносите перчатки и хорошее настроение! Поможем сделать наш город чище.',
        status: 'ACTIVE',
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-10-15'),
        location: 'Центральный парк, Москва',
        projectType: 'ECOLOGY',
        volunteersRequired: 20,
        contactInfo: 'ivan.petrov@example.com',
        createdBy: organizer.id,
      },
    }),
    // Защита животных
    prisma.project.create({
      data: {
        title: 'Помощь бездомным животным',
        description: 'Нужна помощь в приюте для животных: уборка, выгул, кормление. Поможем нашим четвероногим друзьям.',
        status: 'ACTIVE',
        startDate: new Date('2025-10-20'),
        endDate: new Date('2025-10-20'),
        location: 'Приют "Добрые руки", Санкт-Петербург',
        projectType: 'ANIMAL_WELFARE',
        volunteersRequired: 10,
        contactInfo: 'ivan.petrov@example.com',
        createdBy: organizer.id,
      },
    }),
    // Образовательный проект
    prisma.project.create({
      data: {
        title: 'Обучение пожилых людей компьютерной грамотности',
        description: 'Помощь пожилым людям в освоении компьютера и интернета. Научим пользоваться социальными сетями, онлайн-банком и видеосвязью.',
        status: 'ACTIVE',
        startDate: new Date('2025-10-25'),
        endDate: new Date('2025-11-25'),
        location: 'Центр социального обслуживания, Москва',
        projectType: 'EDUCATION',
        volunteersRequired: 5,
        contactInfo: 'ivan.petrov@example.com',
        createdBy: organizer.id,
      },
    }),
    // Социальная помощь
    prisma.project.create({
      data: {
        title: 'Помощь в столовой для бездомных',
        description: 'Раздача еды и организация питания для нуждающихся. Поможем накормить тех, кто оказался в трудной ситуации.',
        status: 'ACTIVE',
        startDate: new Date('2025-10-18'),
        endDate: new Date('2025-10-18'),
        location: 'Благотворительная столовая, Москва',
        projectType: 'SOCIAL',
        volunteersRequired: 8,
        contactInfo: 'ivan.petrov@example.com',
        createdBy: organizer.id,
      },
    }),
    // Культурный проект
    prisma.project.create({
      data: {
        title: 'Организация выставки местных художников',
        description: 'Помощь в организации и проведении выставки картин местных художников. Нужны волонтеры для встречи гостей и помощи художникам.',
        status: 'ACTIVE',
        startDate: new Date('2025-11-05'),
        endDate: new Date('2025-11-10'),
        location: 'Городская галерея, Санкт-Петербург',
        projectType: 'CULTURAL',
        volunteersRequired: 6,
        contactInfo: 'ivan.petrov@example.com',
        createdBy: organizer.id,
      },
    }),
    // Спортивный проект
    prisma.project.create({
      data: {
        title: 'Поддержка городского марафона',
        description: 'Помощь в организации городского благотворительного марафона. Раздача воды, регистрация участников, поддержка на трассе.',
        status: 'ACTIVE',
        startDate: new Date('2025-11-12'),
        endDate: new Date('2025-11-12'),
        location: 'Центральный проспект, Москва',
        projectType: 'SPORTS',
        volunteersRequired: 30,
        contactInfo: 'ivan.petrov@example.com',
        createdBy: organizer.id,
      },
    }),
  ]);

  console.log('✅ Проекты созданы:');
projects.forEach(project => {
  console.log(`   - ${project.title} (${project.projectType})`);
});

console.log('🎉 Все тестовые данные созданы успешно!');
console.log('\nДанные для входа (email уже подтверждены):');
console.log('Организатор: organizer@example.com / password123');
console.log('Волонтер: volunteer@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при создании тестовых данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });