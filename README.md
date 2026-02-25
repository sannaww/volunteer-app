# Волонтерская Платформа
Веб-приложение для организации волонтерской деятельности.

## Функциональность
- Регистрация и авторизация волонтеров и организаторов
- Создание и управление волонтерскими проектами
- Подача заявок на участие
- Система чата между пользователями
- Личные кабинеты

## Технологии
**Frontend:** React, Axios, CSS
**Backend:** Node.js, Express, Prisma, JWT
**База данных:** PostgreSQL

## Установка и запуск
```bash
# Установка всех зависимостей
npm run install:all

# Запуск в development режиме
npm run dev
```

## Запуск в Docker Compose
```bash
# 1) Подготовить env
cp .env.example .env

# 2a) DEV-профиль (nginx, без SSL)
docker compose --profile dev up -d --build

# 2b) PROD-профиль (traefik + SSL по домену)
# в .env должны быть TRAEFIK_HOSTNAME и TRAEFIK_ACME_EMAIL
docker compose --profile prod up -d --build

# 3) Статус чек
docker compose ps
```

- DEV-профиль: приложение доступно на `http://localhost` и `https://localhost`
  (но с самоподписанным SSL)
- PROD-профиль: наружу открыт `traefik` (`80/443` порты), запрашивает TLS-сертификат
  через Let's Encrypt для `TRAEFIK_HOSTNAME`
- Профили `dev` и `prod` одновременно запускать не нужно (оба используют `80/443`).
- Если задать `ADMIN_EMAIL` и `ADMIN_PASSWORD`, одноразовый сервис `admin-bootstrap`
  создаст администратора.
