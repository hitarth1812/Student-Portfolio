# Student Portfolio frontend - multi-stage build (Practical 11)

# ---- Stage 1: build the static bundle with Node ----
FROM node:22-alpine AS build

WORKDIR /app

# The lock file is written by npm 11; npm 10 (bundled with node:22) resolves the
# optional @emnapi/* deps of the Vite toolchain differently and rejects it.
RUN npm install -g npm@11.6.2

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite inlines VITE_* variables at build time, so the API base URL is a build arg
ARG VITE_API_URL=/backend
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Stage 2: serve the bundle with Nginx (no Node, no source, no node_modules) ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/nginx-health || exit 1
