# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps
WORKDIR /opt/app/backend

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /opt/app/backend
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /opt/app/backend/node_modules ./node_modules
COPY --chown=app:app app.js server.js ./

USER app

EXPOSE 5000
CMD ["node", "server.js"]
