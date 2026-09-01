/**
 * Registration / Login Input Validation Middleware
 * Rejects malformed credential payloads before any database or bcrypt work happens.
 * Runs on the server because a client-side check can be bypassed entirely
 * (Postman, curl, or a modified frontend never runs the browser validation).
 */
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

const validateAuthInput = (options = {}) => {
  const { requireMinLength = true } = options;

  return (req, res, next) => {
    const body = req.body || {};
    const errors = {};

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email) {
      errors.email = 'Email is required';
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Email must be a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (requireMinLength && password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    // Hand sanitized values to the controller instead of the raw body
    req.body.email = email.toLowerCase();

    if (typeof body.name === 'string') {
      req.body.name = body.name.trim();
    }

    next();
  };
};

module.exports = validateAuthInput;
