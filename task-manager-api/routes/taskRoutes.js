const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const validateJson = require('../middleware/validateJson');
const validateObjectId = require('../middleware/validateObjectId');

// GET /tasks - Fetch all tasks
router.get('/', taskController.getAllTasks);

// GET /tasks/:id - Fetch single task by ID
router.get('/:id', validateObjectId, taskController.getTaskById);

// POST /tasks - Create a new task
router.post('/', validateJson, taskController.createTask);

// PUT /tasks/:id - Update task by ID
router.put('/:id', validateObjectId, validateJson, taskController.updateTask);

// DELETE /tasks/:id - Delete task by ID
router.delete('/:id', validateObjectId, taskController.deleteTask);

module.exports = router;
