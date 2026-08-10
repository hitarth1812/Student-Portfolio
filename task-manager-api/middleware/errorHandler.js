/**
 * Global Error Handler Middleware
 * Catches unhandled errors, logs them internally, and returns a sanitized JSON response.
 * Express requires all 4 arguments (err, req, res, next) to identify an error-handling middleware.
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Global Internal Error]:', err);

  // Mongoose validation error (required fields, enum mismatch, etc.)
  if (err.name === 'ValidationError') {
    const details = {};
    for (const field in err.errors) {
      details[field] = err.errors[field].message;
    }

    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details
    });
  }

  // Malformed MongoDB ObjectId passed to a query
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid value for field '${err.path}'`
    });
  }

  // Duplicate key error (e.g. unique index violation)
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate field value',
      details: err.keyValue
    });
  }

  // Fallback: unexpected internal error
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Something went wrong'
  });
};

module.exports = errorHandler;
