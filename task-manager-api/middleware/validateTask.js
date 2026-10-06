/**
 * Task Payload Validation Middleware
 * Checks required fields and field types before the request reaches the
 * controller, so obviously malformed data never touches the database.
 *
 * Called as validateTask({ partial: true }) for PUT, where only the fields
 * actually sent need to be valid.
 */
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];
const ALLOWED_STATUSES = ['pending', 'incomplete', 'completed'];

const validateTask = (options = {}) => {
  const { partial = false } = options;

  return (req, res, next) => {
    const body = req.body || {};
    const errors = {};

    const titleProvided = body.title !== undefined;

    if (!partial || titleProvided) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        errors.title = 'Title is required and must be a non-empty string';
      } else if (body.title.trim().length > 120) {
        errors.title = 'Title must be 120 characters or fewer';
      }
    }

    if (body.description !== undefined && typeof body.description !== 'string') {
      errors.description = 'Description must be a string';
    }

    if (body.completed !== undefined && typeof body.completed !== 'boolean') {
      errors.completed = 'Completed must be a boolean';
    }

    if (body.status !== undefined && !ALLOWED_STATUSES.includes(body.status)) {
      errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
    }

    if (body.priority !== undefined && !ALLOWED_PRIORITIES.includes(body.priority)) {
      errors.priority = `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}`;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    // Sanitize: trim the strings we are about to persist
    if (typeof body.title === 'string') {
      req.body.title = body.title.trim();
    }

    if (typeof body.description === 'string') {
      req.body.description = body.description.trim();
    }

    next();
  };
};

module.exports = validateTask;
