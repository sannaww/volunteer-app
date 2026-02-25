# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS frontend-builder
WORKDIR /opt/app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache openssl \
  && mkdir -p /etc/nginx/certs \
  && openssl req -x509 -nodes -newkey rsa:2048 \
     -keyout /etc/nginx/certs/dev.key \
     -out /etc/nginx/certs/dev.crt \
     -days 3650 \
     -subj "/CN=localhost" \
  && apk del openssl

COPY nginx/config/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /opt/app/frontend/build /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
