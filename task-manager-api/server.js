require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const migrateData = require('./config/migrateData');
const logger = require('./middleware/logger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const cacheRoutes = require('./routes/cacheRoutes');

const app = express();

const PORT = process.env.PORT || 5000;

// Fail fast at boot rather than at the first login attempt
if (!process.env.JWT_SECRET) {
  console.error('[Config] JWT_SECRET is missing. Add it to your .env file before starting the server.');
  process.exit(1);
}

// 1. Connect to MongoDB and run safe backward-compatibility migrations
connectDB().then(() => {
  migrateData();
});

// 2. CORS + Body Parser Middleware
app.use(cors());
app.use(express.json());

// 3. Global Logging Middleware
app.use(logger);

// 4. API Routes
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
      flushCache: "DELETE /api/cache (protected)"
    },
    roles: ["user", "manager", "admin"],
    taskStatuses: ["pending", "incomplete", "completed"],
    note: "Protected routes require the header: Authorization: Bearer <token>"
  });
});

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/users', userRoutes);
app.use('/api/cache', cacheRoutes);

// 5. 404 Catch-all Middleware (After all routes)
app.use(notFound);

// 6. Global Error Handler Middleware (MUST be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
