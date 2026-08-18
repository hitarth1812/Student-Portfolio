require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const taskRoutes = require('./routes/taskRoutes');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// 1. Connect to MongoDB
connectDB();

// 2. Body Parser Middleware
app.use(express.json());

// 3. Global Logging Middleware
app.use(logger);

// 4. API Routes
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Task Management REST API is running",
    endpoints: {
      getAllTasks: "GET /tasks",
      getTaskById: "GET /tasks/:id",
      createTask: "POST /tasks",
      updateTask: "PUT /tasks/:id",
      deleteTask: "DELETE /tasks/:id"
    }
  });
});

app.use('/tasks', taskRoutes);

// 5. 404 Catch-all Middleware (After all routes)
app.use(notFound);

// 6. Global Error Handler Middleware (MUST be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
