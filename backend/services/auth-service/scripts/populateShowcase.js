const path = require("path");
const prisma = require("../prismaClient");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
} catch (error) {
  // Best-effort local env loading.
}

const TARGET_PROJECT_TITLES = [
  "Добрый Питер",
  "Уборка в городском парке",
  "Помощь в приюте бездомных животных",
  "Курсы цифровой грамотности для пенсионеров",
  "Сбор вещей для нуждающихся семей",
  "Волонтеры на фестивале уличной культуры",
  "Сопровождение благотворительного забега",
  "День донора в районной поликлинике",
  "Помощь в организации городского форума НКО",
];

const PROFILE_UPDATES = {
  "emiliya.kobzeva@mail.ru": {
    phone: "+79995551234",
    skills:
      "Организация волонтерских программ, координация команд, модерация платформы, работа с партнерами",
    interests:
      "Городские инициативы, образовательные проекты, благотворительные события, UX цифровых сервисов",
    bio:
      "Координирую запуск инициатив на платформе, слежу за качеством заявок и помогаю командам быстро собирать волонтеров для городских проектов.",
  },
  "volunteer@example.com": {
    phone: "+79996654321",
    skills: "Коммуникация с участниками, помощь на регистрации, фотоотчеты, работа на площадках",
    interests:
      "Социальные и культурные проекты, мероприятия для пожилых людей, экологические акции",
    bio:
      "Люблю проекты, где можно общаться с людьми и видеть быстрый полезный результат. Чаще всего беру смены на регистрации, навигации и помощи участникам на месте.",
  },
};

const APPLICATION_SEED = [
  { email: "volunteer@example.com", title: "Добрый Питер", status: "APPROVED", message: "Могу помочь с регистрацией и встречей гостей.", createdAt: "2026-05-02T09:00:00.000Z" },
  { email: "elliott23@ethereal.email", title: "Добрый Питер", status: "APPROVED", message: "Готова взять дневную смену на навигации.", createdAt: "2026-05-02T11:20:00.000Z" },
  { email: "mel_ka76@mail.ru", title: "Добрый Питер", status: "PENDING", message: "Удобно работать на стойке информации.", createdAt: "2026-05-03T08:15:00.000Z" },
  { email: "marquis.hackett8@ethereal.email", title: "Добрый Питер", status: "REJECTED", message: "Готов на вечернюю помощь по площадке.", createdAt: "2026-05-03T12:40:00.000Z" },

  { email: "volunteer@example.com", title: "Уборка в городском парке", status: "APPROVED", message: "Есть опыт участия в экосубботниках.", createdAt: "2026-05-04T09:10:00.000Z" },
  { email: "test@test.ru", title: "Уборка в городском парке", status: "APPROVED", message: "Приду со своими перчатками и мешками.", createdAt: "2026-05-04T13:25:00.000Z" },
  { email: "vladislay@gmail.com", title: "Уборка в городском парке", status: "PENDING", message: "Могу помочь с посадкой цветов.", createdAt: "2026-05-05T10:30:00.000Z" },

  { email: "volunteer@example.com", title: "Помощь в приюте бездомных животных", status: "APPROVED", message: "Умею работать с собаками и помогать на выгуле.", createdAt: "2026-05-06T08:20:00.000Z" },
  { email: "mel_ka76@mail.ru", title: "Помощь в приюте бездомных животных", status: "APPROVED", message: "Могу помогать с кошками и кормлением.", createdAt: "2026-05-06T11:45:00.000Z" },
  { email: "mel_nik76@mail.ru", title: "Помощь в приюте бездомных животных", status: "APPROVED", message: "Готова взять утреннюю смену на уборке вольеров.", createdAt: "2026-05-06T14:10:00.000Z" },
  { email: "marquis.hackett8@ethereal.email", title: "Помощь в приюте бездомных животных", status: "PENDING", message: "Могу приехать после работы и помочь вечером.", createdAt: "2026-05-07T09:05:00.000Z" },
  { email: "test@test.ru", title: "Помощь в приюте бездомных животных", status: "REJECTED", message: "Интересен формат краткой смены на территории приюта.", createdAt: "2026-05-07T16:55:00.000Z" },

  { email: "elliott23@ethereal.email", title: "Курсы цифровой грамотности для пенсионеров", status: "APPROVED", message: "Помогу с объяснением базовых приложений и мессенджеров.", createdAt: "2026-05-08T10:10:00.000Z" },
  { email: "vladislay@gmail.com", title: "Курсы цифровой грамотности для пенсионеров", status: "PENDING", message: "Готов провести блок по Госуслугам и безопасности.", createdAt: "2026-05-08T14:30:00.000Z" },

  { email: "mel_ka76@mail.ru", title: "Сбор вещей для нуждающихся семей", status: "APPROVED", message: "Могу помогать с сортировкой одежды и упаковкой.", createdAt: "2026-05-09T09:20:00.000Z" },
  { email: "marquis.hackett8@ethereal.email", title: "Сбор вещей для нуждающихся семей", status: "PENDING", message: "Подключусь к приему вещей вечером.", createdAt: "2026-05-09T12:10:00.000Z" },
  { email: "test@test.ru", title: "Сбор вещей для нуждающихся семей", status: "PENDING", message: "Готов помочь со складом и маркировкой коробок.", createdAt: "2026-05-09T15:35:00.000Z" },
  { email: "mel_nik76@mail.ru", title: "Сбор вещей для нуждающихся семей", status: "REJECTED", message: "Могу взять на себя выдачу вещей на месте.", createdAt: "2026-05-10T10:00:00.000Z" },

  { email: "volunteer@example.com", title: "Волонтеры на фестивале уличной культуры", status: "APPROVED", message: "Комфортно работать на навигации и у входной зоны.", createdAt: "2026-05-10T11:20:00.000Z" },
  { email: "vladislay@gmail.com", title: "Волонтеры на фестивале уличной культуры", status: "APPROVED", message: "Готов сопровождать участников и гостей.", createdAt: "2026-05-10T13:50:00.000Z" },
  { email: "mel_nik76@mail.ru", title: "Волонтеры на фестивале уличной культуры", status: "PENDING", message: "Могу выйти на вечернюю смену на площадке.", createdAt: "2026-05-10T16:30:00.000Z" },

  { email: "volunteer@example.com", title: "Сопровождение благотворительного забега", status: "APPROVED", message: "Готова работать на выдаче воды и поддержке бегунов.", createdAt: "2026-05-11T07:40:00.000Z" },
  { email: "elliott23@ethereal.email", title: "Сопровождение благотворительного забега", status: "APPROVED", message: "Могу быть на старте и помогать участникам.", createdAt: "2026-05-11T08:05:00.000Z" },
  { email: "mel_ka76@mail.ru", title: "Сопровождение благотворительного забега", status: "PENDING", message: "Подключусь к навигации на трассе.", createdAt: "2026-05-11T09:15:00.000Z" },
  { email: "marquis.hackett8@ethereal.email", title: "Сопровождение благотворительного забега", status: "PENDING", message: "Могу помогать на финише и у сцены.", createdAt: "2026-05-11T10:35:00.000Z" },
  { email: "test@test.ru", title: "Сопровождение благотворительного забега", status: "PENDING", message: "Есть опыт координации волонтеров на спортивных событиях.", createdAt: "2026-05-11T12:25:00.000Z" },
  { email: "vladislay@gmail.com", title: "Сопровождение благотворительного забега", status: "REJECTED", message: "Готов взять блок по зоне регистрации.", createdAt: "2026-05-11T14:45:00.000Z" },

  { email: "volunteer@example.com", title: "День донора в районной поликлинике", status: "APPROVED", message: "Могу встречать доноров и объяснять маршрут.", createdAt: "2026-05-12T08:10:00.000Z" },
  { email: "mel_ka76@mail.ru", title: "День донора в районной поликлинике", status: "APPROVED", message: "Готова помогать в зоне ожидания и регистрации.", createdAt: "2026-05-12T09:35:00.000Z" },
  { email: "mel_nik76@mail.ru", title: "День донора в районной поликлинике", status: "APPROVED", message: "Подключусь к сопровождению участников по кабинетам.", createdAt: "2026-05-12T10:05:00.000Z" },
  { email: "test@test.ru", title: "День донора в районной поликлинике", status: "PENDING", message: "Могу помочь с раздачей памяток и воды.", createdAt: "2026-05-12T11:20:00.000Z" },

  { email: "volunteer@example.com", title: "Помощь в организации городского форума НКО", status: "APPROVED", message: "Есть опыт сопровождения спикеров и гостей форума.", createdAt: "2026-05-13T09:00:00.000Z" },
  { email: "elliott23@ethereal.email", title: "Помощь в организации городского форума НКО", status: "APPROVED", message: "Подключусь к регистрации участников и залам.", createdAt: "2026-05-13T10:10:00.000Z" },
  { email: "marquis.hackett8@ethereal.email", title: "Помощь в организации городского форума НКО", status: "PENDING", message: "Могу помогать с координацией потоков и навигацией.", createdAt: "2026-05-13T11:25:00.000Z" },
  { email: "test@test.ru", title: "Помощь в организации городского форума НКО", status: "PENDING", message: "Возьму смену на выдаче материалов и бейджей.", createdAt: "2026-05-13T13:45:00.000Z" },
  { email: "vladislay@gmail.com", title: "Помощь в организации городского форума НКО", status: "REJECTED", message: "Готов помогать на площадке в течение полного дня.", createdAt: "2026-05-13T16:30:00.000Z" },
];

const REVIEW_SEED = [
  { email: "volunteer@example.com", title: "Добрый Питер", rating: 5, text: "Хорошо организованный городской проект, всё по таймингу и без хаоса.", createdAt: "2026-05-14T10:00:00.000Z" },
  { email: "elliott23@ethereal.email", title: "Добрый Питер", rating: 4, text: "Понравилась команда координаторов и понятные инструкции на месте.", createdAt: "2026-05-14T12:30:00.000Z" },

  { email: "volunteer@example.com", title: "Уборка в городском парке", rating: 5, text: "Очень приятная атмосфера и заметный результат уже за пару часов.", createdAt: "2026-05-15T09:40:00.000Z" },

  { email: "volunteer@example.com", title: "Помощь в приюте бездомных животных", rating: 5, text: "Сильный проект, много пользы и очень включенная команда приюта.", createdAt: "2026-05-15T11:00:00.000Z" },
  { email: "mel_ka76@mail.ru", title: "Помощь в приюте бездомных животных", rating: 4, text: "Нагрузки было много, но всё было хорошо распределено между волонтёрами.", createdAt: "2026-05-15T13:20:00.000Z" },
  { email: "mel_nik76@mail.ru", title: "Помощь в приюте бездомных животных", rating: 4, text: "Организаторы быстро включали в процесс и отвечали на вопросы.", createdAt: "2026-05-15T15:45:00.000Z" },

  { email: "elliott23@ethereal.email", title: "Курсы цифровой грамотности для пенсионеров", rating: 5, text: "Очень благодарная аудитория и аккуратно подготовленные материалы.", createdAt: "2026-05-16T10:15:00.000Z" },

  { email: "mel_ka76@mail.ru", title: "Сбор вещей для нуждающихся семей", rating: 4, text: "Всё структурно: сортировка, упаковка и логистика были заранее продуманы.", createdAt: "2026-05-16T12:05:00.000Z" },

  { email: "volunteer@example.com", title: "Волонтеры на фестивале уличной культуры", rating: 5, text: "Очень живой проект, много взаимодействия с людьми и хорошая координация.", createdAt: "2026-05-16T14:10:00.000Z" },
  { email: "vladislay@gmail.com", title: "Волонтеры на фестивале уличной культуры", rating: 5, text: "Команда быстро распределяла задачи, поэтому смена прошла легко.", createdAt: "2026-05-16T16:25:00.000Z" },

  { email: "volunteer@example.com", title: "Сопровождение благотворительного забега", rating: 3, text: "Идея отличная, но на старте было тесновато и хотелось больше вводной информации.", createdAt: "2026-05-17T09:35:00.000Z" },

  { email: "volunteer@example.com", title: "День донора в районной поликлинике", rating: 4, text: "Полезный проект, участники благодарные, а координаторы всегда на связи.", createdAt: "2026-05-17T11:20:00.000Z" },
  { email: "mel_ka76@mail.ru", title: "День донора в районной поликлинике", rating: 4, text: "Поток людей был плотный, но организация осталась понятной и спокойной.", createdAt: "2026-05-17T13:00:00.000Z" },

  { email: "volunteer@example.com", title: "Помощь в организации городского форума НКО", rating: 5, text: "Сильный событийный проект, задачи были распределены заранее и без накладок.", createdAt: "2026-05-17T15:10:00.000Z" },
  { email: "elliott23@ethereal.email", title: "Помощь в организации городского форума НКО", rating: 4, text: "Форум прошёл чётко, особенно понравилась работа координаторов залов.", createdAt: "2026-05-17T16:45:00.000Z" },
];

const DRAFT_PROJECTS = [
  {
    title: "Черновик: Инклюзивный городской пикник",
    description:
      "Подготовка семейного события на открытом воздухе с навигацией, зонами отдыха и вовлекающими активностями для детей и взрослых.",
    status: "DRAFT",
    startDate: "2026-08-08T11:00:00.000Z",
    endDate: "2026-08-08T17:00:00.000Z",
    location: "Санкт-Петербург, Приморский парк Победы",
    projectType: "SOCIAL",
    volunteersRequired: 18,
    contactInfo: "organizer@example.com",
  },
  {
    title: "Черновик: Волонтерский медиадень для НКО",
    description:
      "Черновик проекта по созданию контента для социальных организаций: интервью, фото, короткие ролики и сопровождение команд на площадке.",
    status: "DRAFT",
    startDate: "2026-08-22T10:00:00.000Z",
    endDate: "2026-08-22T18:00:00.000Z",
    location: "Санкт-Петербург, коворкинг для НКО",
    projectType: "OTHER",
    volunteersRequired: 10,
    contactInfo: "organizer@example.com",
  },
];

function mapBy(items, key) {
  return new Map(items.map((item) => [item[key], item]));
}

async function main() {
  const allEmails = Array.from(
    new Set([
      ...Object.keys(PROFILE_UPDATES),
      ...APPLICATION_SEED.map((item) => item.email),
      ...REVIEW_SEED.map((item) => item.email),
      "organizer@example.com",
    ])
  );

  const users = await prisma.user.findMany({
    where: { email: { in: allEmails } },
    select: { id: true, email: true },
  });

  const userByEmail = mapBy(users, "email");

  for (const email of allEmails) {
    if (!userByEmail.has(email)) {
      throw new Error(`User ${email} not found`);
    }
  }

  const projects = await prisma.project.findMany({
    where: { title: { in: TARGET_PROJECT_TITLES } },
    select: { id: true, title: true },
  });

  if (projects.length !== TARGET_PROJECT_TITLES.length) {
    const missing = TARGET_PROJECT_TITLES.filter((title) => !projects.some((project) => project.title === title));
    throw new Error(`Target projects not found: ${missing.join(", ")}`);
  }

  const projectByTitle = mapBy(projects, "title");
  const organizerId = userByEmail.get("organizer@example.com").id;
  const targetProjectIds = projects.map((project) => project.id);

  await prisma.$transaction(async (tx) => {
    for (const [email, data] of Object.entries(PROFILE_UPDATES)) {
      await tx.user.update({
        where: { email },
        data,
      });
    }

    const existingApplications = await tx.application.findMany({
      where: { projectId: { in: targetProjectIds } },
      select: { id: true },
    });

    if (existingApplications.length) {
      await tx.pointsLog.deleteMany({
        where: { applicationId: { in: existingApplications.map((item) => item.id) } },
      });
    }

    await tx.review.deleteMany({
      where: { projectId: { in: targetProjectIds } },
    });

    await tx.application.deleteMany({
      where: { projectId: { in: targetProjectIds } },
    });

    await tx.project.updateMany({
      where: { id: { in: targetProjectIds } },
      data: {
        avgRating: 0,
        reviewsCount: 0,
      },
    });

    await tx.project.deleteMany({
      where: {
        createdBy: organizerId,
        status: "DRAFT",
        title: { in: DRAFT_PROJECTS.map((item) => item.title) },
      },
    });

    await tx.application.createMany({
      data: APPLICATION_SEED.map((item) => ({
        status: item.status,
        message: item.message,
        createdAt: new Date(item.createdAt),
        userId: userByEmail.get(item.email).id,
        projectId: projectByTitle.get(item.title).id,
      })),
    });

    await tx.review.createMany({
      data: REVIEW_SEED.map((item, index) => ({
        id: `showcase-review-${index + 1}`,
        projectId: projectByTitle.get(item.title).id,
        authorId: String(userByEmail.get(item.email).id),
        rating: item.rating,
        text: item.text,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.createdAt),
      })),
    });

    const reviewStats = await tx.review.groupBy({
      by: ["projectId"],
      where: { projectId: { in: targetProjectIds } },
      _count: { _all: true },
      _avg: { rating: true },
    });

    for (const stat of reviewStats) {
      await tx.project.update({
        where: { id: stat.projectId },
        data: {
          reviewsCount: stat._count._all,
          avgRating: Number((stat._avg.rating || 0).toFixed(2)),
        },
      });
    }

    await tx.project.createMany({
      data: DRAFT_PROJECTS.map((item) => ({
        ...item,
        createdBy: organizerId,
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
      })),
    });
  });

  const [projectsCount, applicationsCount, reviewsCount, draftCount] = await Promise.all([
    prisma.project.count({ where: { title: { in: TARGET_PROJECT_TITLES } } }),
    prisma.application.count({ where: { projectId: { in: targetProjectIds } } }),
    prisma.review.count({ where: { projectId: { in: targetProjectIds } } }),
    prisma.project.count({ where: { createdBy: organizerId, status: "DRAFT" } }),
  ]);

  console.log(
    JSON.stringify(
      {
        projectsCount,
        applicationsCount,
        reviewsCount,
        draftCount,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
