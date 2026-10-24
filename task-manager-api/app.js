/**
 * Express application (Practical 12)
 * Builds the app without connecting to MongoDB or opening a port, so the
 * automated tests can mount it on an ephemeral port; server.js does the rest.
 */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./middleware/logger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const cacheRoutes = require('./routes/cacheRoutes');
const eventRoutes = require('./routes/eventRoutes');
const jobRoutes = require('./routes/jobRoutes');

// Practical 10: register event subscribers and background job handlers at boot
require('./events/subscribers');
require('./jobs/jobHandlers');

const app = express();

// 1. CORS + Body Parser Middleware
app.use(cors());
app.use(express.json());

// 2. Global Logging Middleware
app.use(logger);

// 3. API Routes
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Task Management REST API with RBAC is running",
    endpoints: {
      register: "POST /auth/register (public)",
      login: "POST /auth/login (public)",
      me: "GET /auth/me (protected)",
      logout: "POST /auth/logout (protected)",
      getAllTasks: "GET /tasks (protected)",
      getTaskById: "GET /tasks/:id (protected)",
      createTask: "POST /tasks (protected)",
      updateTask: "PUT /tasks/:id (protected)",
      deleteTask: "DELETE /tasks/:id (protected)",
      getAllUsers: "GET /users (protected: admin, manager)",
      updateUserRole: "PUT /users/:id/role (protected: admin)",
      deleteUser: "DELETE /users/:id (protected: admin)",
      cacheDebug: "GET /api/cache/debug (protected)",
      flushCache: "DELETE /api/cache (protected)",
      streamTicket: "POST /api/events/ticket (protected)",
      eventStream: "GET /api/events/stream?ticket=<ticket> (SSE)",
      eventHistory: "GET /api/events/history (protected)",
      eventStats: "GET /api/events/stats (protected)",
      enqueueJob: "POST /api/jobs (protected, 202 Accepted)",
      listJobs: "GET /api/jobs (protected)",
      jobStatus: "GET /api/jobs/:id (protected)",
      downloadExport: "GET /api/jobs/:id/download (protected)",
      deadLetterQueue: "GET /api/jobs/dlq (protected)",
      health: "GET /health (public, used by Docker HEALTHCHECK)"
    },
    roles: ["user", "manager", "admin"],
    taskStatuses: ["pending", "incomplete", "completed"],
    note: "Protected routes require the header: Authorization: Bearer <token>"
  });
});

// Liveness/readiness probe used by the Docker HEALTHCHECK (Practical 11).
// Reports 503 until MongoDB is connected so dependants wait for a usable API.
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];
app.get('/health', (req, res) => {
  const dbState = DB_STATES[mongoose.connection.readyState] || 'unknown';
  const healthy = dbState === 'connected';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    db: dbState,
    uptimeSeconds: Math.round(process.uptime()),
    hostname: require('os').hostname(),
    node: process.version
  });
});

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/users', userRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/jobs', jobRoutes);

// 4. 404 Catch-all Middleware (After all routes)
app.use(notFound);

// 5. Global Error Handler Middleware (MUST be last)
app.use(errorHandler);

module.exports = app;
