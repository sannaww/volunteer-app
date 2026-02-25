# syntax=docker/dockerfile:1.7

FROM node:20-alpine
WORKDIR /opt/app/backend

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma

CMD ["npx", "prisma", "migrate", "deploy", "--schema=./prisma/schema.prisma"]
