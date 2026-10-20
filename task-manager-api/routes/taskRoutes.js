const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const validateJson = require('../middleware/validateJson');
const validateObjectId = require('../middleware/validateObjectId');
const validateTask = require('../middleware/validateTask');
const { cacheMiddleware, invalidateOnWrite, canServeTask } = require('../middleware/cacheMiddleware');
const { listKey, itemKey } = require('../cache/cacheStore');

// Every task route below is protected: request -> auth -> validation -> (cache) -> controller
router.use(auth);

// GET /tasks - Fetch all tasks for the logged-in user (cached per user + query string)
router.get('/', cacheMiddleware(listKey), taskController.getAllTasks);

// GET /tasks/:id - Fetch single task by ID (cached as task:<id>)
router.get('/:id', validateObjectId, cacheMiddleware(itemKey, canServeTask), taskController.getTaskById);

// POST /tasks - Create a new task (invalidates cached lists)
router.post('/', validateJson, validateTask(), invalidateOnWrite, taskController.createTask);

// PUT /tasks/:id - Update task by ID (partial payloads allowed; invalidates lists + task:<id>)
router.put(
  '/:id',
  validateObjectId,
  validateJson,
  validateTask({ partial: true }),
  invalidateOnWrite,
  taskController.updateTask
);

// DELETE /tasks/:id - Delete task by ID (invalidates lists + task:<id>)
router.delete('/:id', validateObjectId, invalidateOnWrite, taskController.deleteTask);

module.exports = router;
