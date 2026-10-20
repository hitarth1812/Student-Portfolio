const Task = require('../models/Task');

// HATEOAS: attach the actions a client can take next on a single task
const withLinks = (req, task) => {
  const base = `${req.protocol}://${req.get('host')}/tasks`;
  const self = `${base}/${task._id}`;

  return {
    ...task.toObject({ virtuals: true }),
    _links: {
      self: { href: self, method: 'GET' },
      update: { href: self, method: 'PUT' },
      delete: { href: self, method: 'DELETE' },
      all: { href: base, method: 'GET' }
    }
  };
};

// GET /tasks - Get tasks (own tasks for user, all or own for manager/admin)
const getAllTasks = async (req, res, next) => {
  try {
    const isElevated = req.user.role === 'admin' || req.user.role === 'manager';
    const filter = {};

    // Normal users can only see their own tasks
    if (!isElevated || req.query.all !== 'true') {
      filter.user = req.user.id;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const query = Task.find(filter).sort({ createdAt: -1 });

    if (isElevated && req.query.all === 'true') {
      query.populate('user', 'name email role');
    }

    const tasks = await query.exec();
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
};

// GET /tasks/:id - Get task by ID (own task for user, any task for manager/admin)
const getTaskById = async (req, res, next) => {
  try {
    const isElevated = req.user.role === 'admin' || req.user.role === 'manager';
    const filter = { _id: req.params.id };

    if (!isElevated) {
      filter.user = req.user.id;
    }

    const task = await Task.findOne(filter).populate('user', 'name email role');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.status(200).json({ success: true, data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
};

// POST /tasks - Create a new task owned by the authenticated user
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, completed, priority } = req.body || {};

    // Normalize status and backward-compatible completed boolean
    let initialStatus = status || (completed === true ? 'completed' : 'pending');
    let isCompleted = initialStatus === 'completed';

    // The owner comes strictly from the verified token, never from the request body,
    // preventing any privilege escalation or task ownership forging.
    const task = await Task.create({
      title,
      description,
      status: initialStatus,
      completed: isCompleted,
      priority: priority || 'medium',
      user: req.user.id
    });

    res.status(201).json({ success: true, data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
};

// PUT /tasks/:id - Update task (own task for user, any task for manager/admin)
const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, completed, priority } = req.body || {};
    const isElevated = req.user.role === 'admin' || req.user.role === 'manager';

    const filter = { _id: req.params.id };
    if (!isElevated) {
      filter.user = req.user.id;
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;

    // Handle status / completed synchronization
    if (status !== undefined) {
      updates.status = status;
      updates.completed = status === 'completed';
    } else if (completed !== undefined) {
      updates.completed = completed;
      updates.status = completed ? 'completed' : 'pending';
    }

    const task = await Task.findOneAndUpdate(
      filter,
      updates,
      { new: true, runValidators: true, context: 'query' }
    ).populate('user', 'name email role');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.status(200).json({ success: true, data: withLinks(req, task) });
  } catch (err) {
    next(err);
  }
};

// DELETE /tasks/:id - Delete task (own task for user, any task for manager/admin)
const deleteTask = async (req, res, next) => {
  try {
    const isElevated = req.user.role === 'admin' || req.user.role === 'manager';
    const filter = { _id: req.params.id };

    if (!isElevated) {
      filter.user = req.user.id;
    }

    const task = await Task.findOneAndDelete(filter);

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
