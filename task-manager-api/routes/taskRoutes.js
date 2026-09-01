const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const validateJson = require('../middleware/validateJson');
const validateObjectId = require('../middleware/validateObjectId');
const validateTask = require('../middleware/validateTask');

// Every task route below is protected: request -> auth -> validation -> controller
router.use(auth);

// GET /tasks - Fetch all tasks for the logged-in user
router.get('/', taskController.getAllTasks);

// GET /tasks/:id - Fetch single task by ID
router.get('/:id', validateObjectId, taskController.getTaskById);

// POST /tasks - Create a new task
router.post('/', validateJson, validateTask(), taskController.createTask);

// PUT /tasks/:id - Update task by ID (partial payloads allowed)
router.put(
  '/:id',
  validateObjectId,
  validateJson,
  validateTask({ partial: true }),
  taskController.updateTask
);

// DELETE /tasks/:id - Delete task by ID
router.delete('/:id', validateObjectId, taskController.deleteTask);

module.exports = router;
