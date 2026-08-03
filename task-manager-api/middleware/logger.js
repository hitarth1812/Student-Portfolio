/**
 * Logger Middleware
 * Logs timestamp, HTTP method, and requested URL for incoming requests.
 */
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]\n${req.method} ${req.originalUrl || req.url}`);
  next();
};

module.exports = logger;
