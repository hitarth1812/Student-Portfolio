const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validateObjectId = require('../middleware/validateObjectId');
const validateJson = require('../middleware/validateJson');

// All user management routes require valid authentication
router.use(auth);

// GET /users - View users (accessible by admin and manager)
router.get('/', authorize('admin', 'manager'), userController.getAllUsers);

// PUT /users/:id/role - Change user role (admin only)
router.put('/:id/role', authorize('admin'), validateObjectId, validateJson, userController.updateUserRole);

// DELETE /users/:id - Delete user (admin only)
router.delete('/:id', authorize('admin'), validateObjectId, userController.deleteUser);

module.exports = router;
