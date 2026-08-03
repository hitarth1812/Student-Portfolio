/**
 * Global Error Handler Middleware
 * Catches unhandled errors, logs them internally, and returns a sanitized 500 response.
 * Express requires all 4 arguments (err, req, res, next) to identify an error-handling middleware.
 */
const errorHandler = (err, req, res, next) => {
  // Log full internal error stack for server-side monitoring
  console.error('[Global Internal Error]:', err);

  // Sanitized client response without stack trace or system paths
  res.status(500).json({
    error: "Something went wrong"
  });
};

module.exports = errorHandler;
