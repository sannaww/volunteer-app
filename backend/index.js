const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Настройка почтового сервиса (для теста используем Ethereal)
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'marquis.hackett8@ethereal.email', 
    pass: 'KrjwfF8BMXK7qCbARW'
  }
});

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(cors({
origin: 'http://localhost:3001',
credentials: true
}));
app.use(express.json());

// Тестовый маршрут
app.get('/api/test', (req, res) => {
  res.json({ message: 'Сервер работает! Ура!' });
});

// Получить все проекты с поддержкой фильтрации и поиска
app.get('/api/projects', async (req, res) => {
  try {
    const {
      search,
      projectType,
      location,
      status,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Базовые условия для фильтрации
    const where = {};

// Фильтр по статусу
if (status) {
  // Поддержка нескольких статусов через запятую
  if (status.includes(',')) {
    const statuses = status.split(',');
    where.status = { in: statuses };
  } else {
    where.status = status;
  }
} else {
  // Показываем все, кроме черновиков
  where.status = { not: 'DRAFT' };
}

    // Поиск по названию и описанию
    if (search) {
  where.OR = [
    { title: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } }
  ];
}

    // Фильтр по типу проекта
    if (projectType) {
      where.projectType = projectType;
    }

    // Фильтр по местоположению
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Фильтр по статусу - ВАЖНО: этот блок должен быть таким
if (status) {
  where.status = status;
} else {
  // Если статус не указан, показываем все кроме черновиков
  where.status = { not: 'DRAFT' };
}

    // Фильтр по дате
    if (dateFrom || dateTo) {
      where.OR = [
        // Проекты, которые начинаются в указанном диапазоне
        {
          startDate: {
            gte: dateFrom ? new Date(dateFrom) : undefined,
            lte: dateTo ? new Date(dateTo) : undefined
          }
        },
        // Или проекты без конкретной даты (постоянные)
        { startDate: null }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        applications: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
    });

    // Добавляем счетчики заявок
    const projectsWithStats = projects.map(project => ({
      ...project,
      applicationsCount: project.applications.length,
      pendingApplicationsCount: project.applications.filter(app => app.status === 'PENDING').length
    }));

    res.json(projectsWithStats);
  } catch (error) {
    console.error('Ошибка при загрузке проектов:', error);
    res.status(500).json({ error: 'Не удалось загрузить проекты' });
  }
});

// Создать новый проект
app.post('/api/projects', async (req, res) => {
  const { 
    title, 
    description, 
    status, 
    startDate, 
    endDate, 
    location, 
    projectType, 
    volunteersRequired, 
    contactInfo 
  } = req.body;

  const token = req.headers.authorization?.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');
if (contactInfo) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo);
  const isPhone = /^(\+7|7|8)\d{10}$/.test(contactInfo.replace(/\D/g, ''));
  
  if (!isEmail && !isPhone) {
    return res.status(400).json({ 
      error: 'Контактная информация должна быть email (example@mail.com) или телефон в формате +79991234567' 
    });
  }
}
    // Подготавливаем данные для создания проекта
    const projectData = {
      title,
      description,
      status: status || 'DRAFT',
      createdBy: decoded.userId
    };

    // Добавляем опциональные поля, если они переданы
    if (startDate) projectData.startDate = new Date(startDate);
    if (endDate) projectData.endDate = new Date(endDate);
    if (location) projectData.location = location;
    if (projectType) projectData.projectType = projectType;
    if (volunteersRequired) projectData.volunteersRequired = parseInt(volunteersRequired) || 1;
    if (contactInfo) projectData.contactInfo = contactInfo;

    console.log('Создание проекта с данными:', projectData);

    const project = await prisma.project.create({
      data: projectData,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(project);

  } catch (error) {
    console.error('Ошибка при создании проекта:', error);
    res.status(400).json({ error: 'Не удалось создать проект' });
  }
});

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
  const { email, password, firstName, lastName, role, contactInfo } = req.body;

  try {
    // Проверяем обязательные поля
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    // Проверяем, нет ли уже пользователя с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // Проверка contactInfo (если предоставлена)
    if (contactInfo) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo);
      const isPhone = /^\+7\d{10}$/.test(contactInfo.replace(/\s|\(|\)|-/g, ''));
      
      if (!isEmail && !isPhone) {
        return res.status(400).json({
          error: 'Контактная информация должна быть email (example@mail.com) или телефон в формате +79991234567'
        });
      }
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хешируем пароль
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 14);

    // Создаем пользователя с сразу подтвержденным email
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

    // Не возвращаем пароль в ответе
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      ...userWithoutPassword,
      message: 'Регистрация успешна! Вы можете войти в свой аккаунт.'
    });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ error: 'Не удалось зарегистрировать пользователя' });
  }
});

// Подтверждение email
app.get('/api/auth/verify-email', async (req, res) => {
  const { token, id } = req.query;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(400).json({ error: 'Неверная ссылка подтверждения' });
    }

    if (user.emailVerificationToken !== token) {
      return res.status(400).json({ error: 'Неверный токен подтверждения' });
    }

    // Обновляем пользователя
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        emailVerified: true,
        emailVerificationToken: null // Удаляем токен после использования
      }
    });

    // Перенаправляем на страницу успеха
    res.send(`
      <html>
        <head><title>Email подтвержден</title></head>
        <body>
          <h1>Email успешно подтвержден!</h1>
          <p>Теперь вы можете войти в свой аккаунт.</p>
          <a href="http://localhost:3001/login">Перейти к входу</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Ошибка при подтверждении email:', error);
    res.status(500).send('Ошибка при подтверждении email');
  }
});

// Вход пользователя
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('🔐 Попытка входа для email:', email);

    // Проверяем, что email и password предоставлены
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ Пользователь не найден');
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, подтвержден ли email
    /*if (!user.emailVerified) {
      console.log('❌ Email не подтвержден');
      return res.status(400).json({ error: 'Email не подтвержден. Проверьте вашу почту.' });
    }*/

    // Проверяем пароль
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Неверный пароль');
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    // Генерируем JWT токен
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      'your-secret-key',
      { expiresIn: '24h' }
    );

    // Не возвращаем пароль в ответе
    const { password: _, ...userWithoutPassword } = user;

    console.log('✅ Успешный вход для пользователя:', user.email);
    
    res.json({
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('💥 Ошибка при входе:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Не удалось войти' });
  }
});

// Получить текущего пользователя (по токену)
app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

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
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

// Простой тестовый endpoint
app.get('/api/test-applications', async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        project: {
          select: {
            title: true
          }
        }
      }
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке заявок' });
  }
});

// Получить проект по ID
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        applications: {
          select: {
            id: true,
            status: true
          }
        }
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Добавляем счетчики заявок
    const projectWithStats = {
      ...project,
      applicationsCount: project.applications.length,
      pendingApplicationsCount: project.applications.filter(app => app.status === 'PENDING').length
    };

    res.json(projectWithStats);
  } catch (error) {
    console.error('Ошибка при загрузке проекта:', error);
    res.status(500).json({ error: 'Не удалось загрузить проект' });
  }
});

// Подать заявку на проект
app.post('/api/projects/:projectId/applications', async (req, res) => {
  const { projectId } = req.params;
  const { message } = req.body;
  const token = req.headers.authorization?.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    // Проверяем, что проект активен - ДОБАВЛЕННАЯ ПРОВЕРКА
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) }
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    if (project.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Нельзя подать заявку на неактивный проект' });
    }

    // Проверяем, не подал ли пользователь уже заявку
    const existingApplication = await prisma.application.findFirst({
      where: {
        userId: decoded.userId,
        projectId: parseInt(projectId)
      }
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'Вы уже подали заявку на этот проект' });
    }

    const application = await prisma.application.create({
      data: {
        message,
        userId: decoded.userId,
        projectId: parseInt(projectId)
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        project: {
          select: {
            title: true
          }
        }
      }
    });

    res.status(201).json(application);

  } catch (error) {
    console.error('Ошибка при подаче заявки:', error);
    res.status(500).json({ error: 'Не удалось подать заявку' });
  }
});

// Получить заявки для проекта (только для создателя проекта)
app.get('/api/projects/:projectId/applications', async (req, res) => {
  const { projectId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    // Проверяем, что пользователь - создатель проекта
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) }
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    if (project.createdBy !== decoded.userId) {
      return res.status(403).json({ error: 'Нет доступа к заявкам этого проекта' });
    }

    const applications = await prisma.application.findMany({
      where: { projectId: parseInt(projectId) },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(applications);
  } catch (error) {
    console.error('Ошибка при получении заявок:', error);
    res.status(500).json({ error: 'Не удалось получить заявки' });
  }
});

// Получить заявки текущего пользователя
app.get('/api/my-applications', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    const applications = await prisma.application.findMany({
      where: { userId: decoded.userId },
      include: {
        project: {
          include: {
            creator: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(applications);
  } catch (error) {
    console.error('Ошибка при получении заявок:', error);
    res.status(500).json({ error: 'Не удалось получить заявки' });
  }
});

// Обновить статус заявки (принять/отклонить)
app.put('/api/applications/:applicationId', async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    // Находим заявку
    const application = await prisma.application.findUnique({
      where: { id: parseInt(applicationId) },
      include: { project: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Проверяем, что пользователь - создатель проекта
    if (application.project.createdBy !== decoded.userId) {
      return res.status(403).json({ error: 'Нет прав для изменения этой заявки' });
    }

    // Обновляем статус
    const updatedApplication = await prisma.application.update({
      where: { id: parseInt(applicationId) },
      data: { status },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json(updatedApplication);
  } catch (error) {
    console.error('Ошибка при обновлении заявки:', error);
    res.status(500).json({ error: 'Не удалось обновить заявку' });
  }
});

// DELETE /api/applications/:id - Отмена заявки волонтером
app.delete('/api/applications/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');
    const applicationId = parseInt(req.params.id);

    // Находим заявку
    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Проверяем, что пользователь отменяет свою заявку
    if (application.userId !== decoded.userId) {
      return res.status(403).json({ error: 'Недостаточно прав для отмены этой заявки' });
    }

    // Проверяем, что заявка еще не подтверждена - ЭТО ЕДИНСТВЕННАЯ ПРОВЕРКА
    if (application.status !== 'PENDING') {
      return res.status(400).json({ 
        error: 'Нельзя отменить заявку со статусом: ' + application.status 
      });
    }

    // Удаляем заявку
    await prisma.application.delete({
      where: { id: applicationId },
    });

    res.json({ 
      message: 'Заявка успешно отменена',
      cancelledApplicationId: applicationId
    });

  } catch (error) {
    console.error('Ошибка при отмене заявки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});
// Получить информацию об организаторе проекта
app.get('/api/projects/:id/organizer', async (req, res) => {
  const { id } = req.params;
  
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    res.json(project.creator);
  } catch (error) {
    console.error('Ошибка при получении организатора:', error);
    res.status(500).json({ error: 'Не удалось получить информацию об организаторе' });
  }
});
//Получить статистику организатора
app.get('/api/organizer/stats', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    // Получаем все проекты организатора
    const projects = await prisma.project.findMany({
      where: { createdBy: decoded.userId },
      include: {
        applications: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Статистика по проектам
    const totalProjects = projects.length;
    const projectsByStatus = {
      DRAFT: projects.filter(p => p.status === 'DRAFT').length,
      ACTIVE: projects.filter(p => p.status === 'ACTIVE').length,
      COMPLETED: projects.filter(p => p.status === 'COMPLETED').length,
      CANCELLED: projects.filter(p => p.status === 'CANCELLED').length
    };

    // Статистика по заявкам
    const allApplications = projects.flatMap(p => p.applications);
    const totalApplications = allApplications.length;
    const applicationsByStatus = {
      PENDING: allApplications.filter(a => a.status === 'PENDING').length,
      APPROVED: allApplications.filter(a => a.status === 'APPROVED').length,
      REJECTED: allApplications.filter(a => a.status === 'REJECTED').length
    };

    // Уникальные волонтеры (по одному разу, даже если несколько заявок)
    const uniqueVolunteers = [...new Set(allApplications.map(a => a.userId))].length;

    // Самый популярный проект (по количеству заявок)
    const popularProject = projects.reduce((prev, current) => {
      return (prev.applications.length > current.applications.length) ? prev : current;
    }, projects[0]);

    // Последние заявки (5 штук)
    const recentApplications = allApplications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.json({
      projects: {
        total: totalProjects,
        byStatus: projectsByStatus
      },
      applications: {
        total: totalApplications,
        byStatus: applicationsByStatus,
        uniqueVolunteers: uniqueVolunteers
      },
      popularProject: popularProject ? {
        title: popularProject.title,
        applicationsCount: popularProject.applications.length
      } : null,
      recentApplications: recentApplications.map(app => ({
        id: app.id,
        projectTitle: projects.find(p => p.id === app.projectId)?.title,
        volunteerName: `${app.user.firstName} ${app.user.lastName}`,
        status: app.status,
        createdAt: app.createdAt
      }))
    });

  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ error: 'Не удалось получить статистику' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    description, 
    status, 
    startDate, 
    endDate, 
    location, 
    projectType, 
    volunteersRequired, 
    contactInfo 
  } = req.body;

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    // Проверяем, что пользователь - создатель проекта
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    if (project.createdBy !== decoded.userId) {
      return res.status(403).json({ error: 'Нет прав для редактирования этого проекта' });
    }
if (contactInfo !== undefined) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo);
      const isPhone = /^\+7\d{10}$/.test(contactInfo.replace(/\s|\(|\)|-/g, ''));
      
      if (!isEmail && !isPhone) {
        return res.status(400).json({ 
          error: 'Контактная информация должна быть email (example@mail.com) или телефон в формате +79991234567' 
        });
      }
    }
    // Подготавливаем данные для обновления
    const updateData = {
      title,
      description,
      status
    };

    // Добавляем остальные поля только если они переданы
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (location !== undefined) updateData.location = location;
    if (projectType !== undefined) updateData.projectType = projectType;
    if (volunteersRequired !== undefined) updateData.volunteersRequired = parseInt(volunteersRequired) || 1;
    if (contactInfo !== undefined) updateData.contactInfo = contactInfo;

    console.log('Данные для обновления:', updateData); // Для отладки

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        applications: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    // Добавляем счетчики заявок к ответу
    const projectWithStats = {
      ...updatedProject,
      applicationsCount: updatedProject.applications.length,
      pendingApplicationsCount: updatedProject.applications.filter(app => app.status === 'PENDING').length
    };

    res.json(projectWithStats);

  } catch (error) {
    console.error('Ошибка при обновлении проекта:', error);
    res.status(500).json({ error: 'Не удалось обновить проект' });
  }
});

// Удаление проекта
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    // Проверяем, что пользователь - создатель проекта
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    if (project.createdBy !== decoded.userId) {
      return res.status(403).json({ error: 'Нет прав для удаления этого проекта' });
    }

    // Удаляем проект (Prisma автоматически удалит связанные заявки благодаря onDelete: Cascade)
    await prisma.project.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Проект успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении проекта:', error);
    res.status(500).json({ error: 'Не удалось удалить проект' });
  }
});

// Получить профиль текущего пользователя
app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');
    
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
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Недействительный токен' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истек' });
    }
    
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить профиль пользователя
app.put('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { firstName, lastName, phone, skills, interests, bio } = req.body;

  console.log('🔍 Запрос на обновление профиля:', req.body);
  console.log('📨 Получены данные:', req.body);
  console.log('📨 Навыки получены:', skills);  // ← Добавьте эту строку

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    console.log('👤 Обновление профиля для пользователя ID:', decoded.userId);

    // Проверяем, что обязательные поля есть
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Имя и фамилия обязательны' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : null,
        skills: skills ? skills.trim() : null,
        interests: interests ? interests.trim() : null,
        bio: bio ? bio.trim() : null
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
        avatarUrl: true,
        createdAt: true
      }
    });
    console.log('✅ Профиль успешно обновлен:', updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('💥 Ошибка при обновлении профиля:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.status(500).json({ error: 'Не удалось обновить профиль: ' + error.message });
  }
});

// Получить историю участия пользователя (проекты, где заявка одобрена)
app.get('/api/profile/participation-history', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    const participationHistory = await prisma.application.findMany({
      where: { 
        userId: decoded.userId,
        status: 'APPROVED'
      },
      include: {
        project: {
          include: {
            creator: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(participationHistory);
  } catch (error) {
    console.error('Ошибка при получении истории участия:', error);
    res.status(500).json({ error: 'Не удалось получить историю участия' });
  }
});

// Добавь этот маршрут для отладки
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке пользователей' });
  }
});

app.get('/api/debug/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        applications: true
      },
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке проектов' });
  }
});
// 🗑️ УДАЛИТЬ АККАУНТ
app.delete('/api/auth/account', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    console.log('🔍 Попытка удаления аккаунта для пользователя ID:', decoded.userId);

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      console.log('❌ Пользователь не найден');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log('👤 Найден пользователь для удаления:', user.email);

    // Сначала удаляем связанные данные вручную (на всякий случай)
    try {
      // Удаляем заявки пользователя
      await prisma.application.deleteMany({
        where: { userId: decoded.userId }
      });
      console.log('✅ Заявки пользователя удалены');

      // Удаляем проекты пользователя (и их заявки благодаря каскаду)
      await prisma.project.deleteMany({
        where: { createdBy: decoded.userId }
      });
      console.log('✅ Проекты пользователя удалены');

      // Удаляем сообщения пользователя
      await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: decoded.userId },
            { receiverId: decoded.userId }
          ]
        }
      });
      console.log('✅ Сообщения пользователя удалены');

    } catch (relatedError) {
      console.log('⚠️ Ошибка при удалении связанных данных:', relatedError);
      // Продолжаем, даже если есть ошибки с связанными данными
    }

    // Удаляем самого пользователя
    await prisma.user.delete({
      where: { id: decoded.userId }
    });

    console.log(`✅ Аккаунт пользователя ${user.email} полностью удален`);

    res.json({ 
      success: true,
      message: 'Аккаунт успешно удален',
      deletedUser: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.error('💥 Ошибка при удалении аккаунта:', error);
    console.error('Stack trace:', error.stack);
    
    // Более детальная информация об ошибке
    if (error.code === 'P2003') {
      return res.status(500).json({ error: 'Не удалось удалить аккаунт из-за связанных данных. Попробуйте позже.' });
    }
    
    res.status(500).json({ error: 'Не удалось удалить аккаунт: ' + error.message });
  }
});
// 📨 ЧАТ: Отправить сообщение
app.post('/api/messages', async (req, res) => {
  try {
    const { receiverId, projectId, text } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');

    // Проверяем, что получатель существует
    const receiver = await prisma.user.findUnique({
      where: { id: parseInt(receiverId) }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Получатель не найден' });
    }

    const message = await prisma.message.create({
      data: {
        text,
        senderId: decoded.userId,
        receiverId: parseInt(receiverId),
        projectId: projectId ? parseInt(projectId) : null
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    res.status(500).json({ error: 'Не удалось отправить сообщение' });
  }
});

// 📨 ЧАТ: Получить переписку с пользователем
app.get('/api/messages/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');
    const currentUserId = decoded.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: parseInt(userId) },
          { senderId: parseInt(userId), receiverId: currentUserId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Помечаем сообщения как прочитанные
    await prisma.message.updateMany({
      where: {
        senderId: parseInt(userId),
        receiverId: currentUserId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json(messages);
  } catch (error) {
    console.error('Ошибка при загрузке переписки:', error);
    res.status(500).json({ error: 'Не удалось загрузить переписку' });
  }
});

// 📨 ЧАТ: Получить список диалогов
app.get('/api/messages/conversations', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'your-secret-key');
    const userId = decoded.userId;

    // Получаем последние сообщения из каждого диалога
    const lastMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Группируем по собеседникам
    const conversations = [];
    const seenUsers = new Set();

    for (const message of lastMessages) {
      const otherUser = message.senderId === userId ? message.receiver : message.sender;
      const conversationKey = `${otherUser.id}`;

      if (!seenUsers.has(conversationKey)) {
        seenUsers.add(conversationKey);
        
        // Считаем непрочитанные сообщения
        const unreadCount = await prisma.message.count({
          where: {
            senderId: otherUser.id,
            receiverId: userId,
            isRead: false
          }
        });

        conversations.push({
          user: otherUser,
          lastMessage: message,
          unreadCount
        });
      }
    }

    res.json(conversations);
  } catch (error) {
    console.error('Ошибка при загрузке диалогов:', error);
    res.status(500).json({ error: 'Не удалось загрузить диалоги' });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});