# === Build stage ===
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# يُمرَّر وقت الـ build (docker compose build --build-arg VITE_API_URL=...)
# افتراضيًا /api لأن Caddy (الخطوة الجاية) هيعمل reverse proxy لنفس الدومين
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# === Serve stage (Caddy: static files + auto HTTPS) ===
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
