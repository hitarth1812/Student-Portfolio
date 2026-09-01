const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const validateJson = require('../middleware/validateJson');
const validateAuthInput = require('../middleware/validateAuthInput');

// POST /auth/register - Create an account
router.post('/register', validateJson, validateAuthInput(), authController.register);

// POST /auth/login - Exchange credentials for a JWT
// requireMinLength is off here: length rules belong to registration, and
// enforcing them on login would leak information about stored passwords.
router.post('/login', validateJson, validateAuthInput({ requireMinLength: false }), authController.login);

// GET /auth/me - Protected: returns the caller's own details
router.get('/me', auth, authController.getMe);

// POST /auth/logout - Protected: client-side token disposal
router.post('/logout', auth, authController.logout);

module.exports = router;
