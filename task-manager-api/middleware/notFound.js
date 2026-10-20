/**
 * 404 Not Found Middleware
 * Catch-all handler for invalid or undefined routes.
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
};

module.exports = notFound;
