# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps
WORKDIR /opt/app/backend

COPY package.json package-lock.json ./
RUN npm ci

COPY services/applications-service/package.json services/applications-service/package-lock.json ./services/applications-service/
RUN npm ci --omit=dev --prefix ./services/applications-service

COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma \
  && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /opt/app/backend
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /opt/app/backend/node_modules ./node_modules
COPY --from=deps --chown=app:app /opt/app/backend/services/applications-service/node_modules ./services/applications-service/node_modules
COPY --chown=app:app services/applications-service ./services/applications-service

WORKDIR /opt/app/backend/services/applications-service
USER app

EXPOSE 5003
CMD ["node", "server.js"]
