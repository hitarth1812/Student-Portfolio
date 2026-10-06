const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Reads the bearer token from the Authorization header, verifies its signature
 * and expiry against JWT_SECRET, and attaches the decoded payload to req.user.
 *
 * jwt.verify() THROWS on a tampered or expired token, so it is wrapped in
 * try/catch - an uncaught throw here would take the whole server down.
 */
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Expected format: "Bearer <token>" (note the single space)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized: missing or malformed Authorization header'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized: no token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Downstream controllers read req.user to scope data and authorize permissions
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role || 'user' };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired, please log in again'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Not authorized: invalid token'
    });
  }
};

module.exports = auth;
