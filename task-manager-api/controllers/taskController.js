const { tasks, getNextId } = require('../data/tasks');

/**
 * Controller containing all business logic for task CRUD operations.
 */

// GET /tasks - Get all tasks
const getAllTasks = (req, res) => {
  res.status(200).json(tasks);
};

// GET /tasks/:id - Get task by ID
const getTaskById = (req, res) => {
  const taskId = req.taskId || Number(req.params.id);
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({
      error: "Task not found"
    });
  }

  res.status(200).json(task);
};

// POST /tasks - Create a new task
const createTask = (req, res) => {
  const { title } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      error: "Title is required"
    });
  }

  const newTask = {
    id: getNextId(),
    title: title.trim(),
    completed: false
  };

  tasks.push(newTask);

  res.status(201).json(newTask);
};

// PUT /tasks/:id - Update an existing task
const updateTask = (req, res) => {
  const taskId = req.taskId || Number(req.params.id);
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({
      error: "Task not found"
    });
  }

  const { title, completed } = req.body || {};

  // Validate payload fields
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({
      error: "Title must be a non-empty string"
    });
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({
      error: "Completed must be a boolean value"
    });
  }

  // Perform update
  if (title !== undefined) {
    tasks[taskIndex].title = title.trim();
  }
  if (completed !== undefined) {
    tasks[taskIndex].completed = completed;
  }

  res.status(200).json(tasks[taskIndex]);
};

// DELETE /tasks/:id - Delete a task
const deleteTask = (req, res) => {
  const taskId = req.taskId || Number(req.params.id);
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({
      error: "Task not found"
    });
  }

  const [deletedTask] = tasks.splice(taskIndex, 1);

  res.status(200).json({
    message: "Task deleted successfully",
    task: deletedTask
  });
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
};
