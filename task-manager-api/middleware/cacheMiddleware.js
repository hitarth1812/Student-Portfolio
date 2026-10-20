const {
  cache,
  recordHit,
  recordMiss,
  invalidateTaskCache
} = require('../cache/cacheStore');

const isSuccess = (statusCode) => statusCode >= 200 && statusCode < 300;

/**
 * Cache-aside Read Middleware
 * HIT  -> answers straight from memory, the controller and MongoDB are skipped.
 * MISS -> wraps res.json so the controller's 2xx body is stored on the way out.
 *
 * keyBuilder(req) returns the cache key; canServe(body, req) optionally decides
 * whether a cached body may be returned to this particular caller.
 */
const cacheMiddleware = (keyBuilder, canServe = () => true) => (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = keyBuilder(req);
  const cached = cache.get(key);

  if (cached !== undefined && canServe(cached, req)) {
    recordHit();
    res.set('X-Cache', 'HIT');
    res.set('X-Cache-Lookup', 'in-memory (node-cache)');
    return res.status(200).json(cached);
  }

  recordMiss();
  res.set('X-Cache', 'MISS');

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (isSuccess(res.statusCode)) {
      cache.set(key, body);
    }
    return originalJson(body);
  };

  next();
};

/**
 * Write Invalidation Middleware
 * Clears the cached task lists (and task:<id> when the route has an id) right
 * before a successful write response is sent, so the next read hits MongoDB.
 */
const invalidateOnWrite = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (isSuccess(res.statusCode)) {
      invalidateTaskCache(req.params.id);
    }
    return originalJson(body);
  };

  next();
};

// Single-task bodies are cached under task:<id> regardless of who asked, so a
// normal user may only be served a cached task they own (same rule as the controller).
const canServeTask = (body, req) => {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return true;
  }

  const owner = body && body.data && body.data.user;
  const ownerId = owner && typeof owner === 'object' ? owner._id : owner;

  return String(ownerId) === String(req.user.id);
};

module.exports = { cacheMiddleware, invalidateOnWrite, canServeTask };
