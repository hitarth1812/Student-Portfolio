/**
 * JSON Content-Type Validation Middleware
 * Enforces that POST and PUT requests include Content-Type: application/json.
 */
const validateJson = (req, res, next) => {
  const contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({
      error: "Content-Type must be application/json"
    });
  }

  next();
};

module.exports = validateJson;
