const Task = require('../models/Task');

// GET /tasks - Get all tasks belonging to the authenticated user
const getAllTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
};

// GET /tasks/:id - Get one of the caller's own tasks by ID
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// POST /tasks - Create a new task owned by the authenticated user
const createTask = async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body || {};

    // The owner comes from the verified token, never from the request body,
    // so a client cannot create a task on someone else's behalf.
    const task = await Task.create({
      title,
      description,
      completed,
      priority,
      user: req.user.id
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// PUT /tasks/:id - Update one of the caller's own tasks
const updateTask = async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body || {};

    // Only include fields that were actually sent, so a partial update
    // does not blank out the rest of the document.
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (completed !== undefined) updates.completed = completed;
    if (priority !== undefined) updates.priority = priority;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updates,
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

// DELETE /tasks/:id - Delete one of the caller's own tasks
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });

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
