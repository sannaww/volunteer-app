const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/projects.routes');

const prisma = new PrismaClient();
const app = express();

/* ================== MIDDLEWARE ================== */
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================== ROUTES ================== */
app.use('/api/auth', authRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Сервер работает' });
});
app.use('/api/projects', projectRoutes);
/* ================== PROJECTS ================== */
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

    const where = {};

    if (status) {
      where.status = status.includes(',')
        ? { in: status.split(',') }
        : status;
    } else {
      where.status = { not: 'DRAFT' };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (projectType) where.projectType = projectType;
    if (location) where.location = { contains: location, mode: 'insensitive' };

    if (dateFrom || dateTo) {
      where.OR = [
        {
          startDate: {
            gte: dateFrom ? new Date(dateFrom) : undefined,
            lte: dateTo ? new Date(dateTo) : undefined
          }
        },
        { startDate: null }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        creator: { select: { firstName: true, lastName: true } },
        applications: { select: { status: true } }
      },
      orderBy: { [sortBy]: sortOrder }
    });

    res.json(projects.map(p => ({
      ...p,
      applicationsCount: p.applications.length,
      pendingApplicationsCount: p.applications.filter(a => a.status === 'PENDING').length
    })));
  } catch (e) {
    res.status(500).json({ error: 'Ошибка загрузки проектов' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        applications: true
      }
    });

    if (!project) return res.status(404).json({ error: 'Проект не найден' });

    res.json({
      ...project,
      applicationsCount: project.applications.length,
      pendingApplicationsCount: project.applications.filter(a => a.status === 'PENDING').length
    });
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки проекта' });
  }
});

/* ================== AUTH ================== */
app.post('/api/auth/register', async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(400).json({ error: 'Email уже используется' });

  const hashedPassword = await bcrypt.hash(password, 14);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'volunteer',
      emailVerified: true
    }
  });

  const { password: _, ...safeUser } = user;
  res.status(201).json(safeUser);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'Неверные данные' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Неверные данные' });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    'your-secret-key',
    { expiresIn: '24h' }
  );

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

/* ================== PROFILE ================== */
app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });

  try {
    const { userId } = jwt.verify(token, 'your-secret-key');
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

    res.json(user);
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
});

/* ================== EXPORT ================== */
module.exports = app;
