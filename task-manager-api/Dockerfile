# Task Manager API - production image (Practical 11)
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

# Dependencies first: this layer is cached until package*.json changes,
# so editing source code does not trigger a fresh npm install.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

# The app writes logs.csv, logs/ and exports/ at runtime
RUN mkdir -p logs exports && chown -R node:node /app

# Never run the server as root inside the container
USER node

EXPOSE 5000

# wget ships with Alpine's busybox, so no extra package is needed
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-5000}/health || exit 1

CMD ["node", "server.js"]
