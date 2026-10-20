const User = require('../models/User');

/**
 * RBAC Authorization Middleware
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Resolves the user from the database to guarantee the role has not become stale
 * or revoked, ensuring the backend is the authoritative source of truth.
 *
 * Usage:
 *   authorize('admin')
 *   authorize('admin', 'manager')
 */
const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized: authentication required'
        });
      }

      // Fetch user from DB to guarantee live authoritative role
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized: user account no longer exists'
        });
      }

      // Ensure req.user reflects the fresh role from the database
      req.user.role = user.role;

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to perform this action'
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = authorize;
