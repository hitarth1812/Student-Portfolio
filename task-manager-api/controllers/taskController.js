const Task = require('../models/Task');

// GET /tasks - Get all tasks
const getAllTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find();
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
};

// GET /tasks/:id - Get task by ID
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// POST /tasks - Create a new task
const createTask = async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body || {};

    const task = await Task.create({ title, description, completed, priority });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// PUT /tasks/:id - Update an existing task
const updateTask = async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body || {};

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, completed, priority },
      { new: true, runValidators: true, context: 'query' }
    );

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// DELETE /tasks/:id - Delete a task
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.status(200).json({ success: true, message: 'Task deleted successfully', data: task });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
};
