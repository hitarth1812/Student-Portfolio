const NodeCache = require('node-cache');

/**
 * In-memory cache store (Practical 9)
 * A single node-cache instance shared by the whole process. Entries expire after
 * CACHE_TTL seconds; expired keys are swept every 120 seconds.
 *
 * useClones keeps cached values isolated: a controller mutating a response object
 * can never corrupt what is stored in the cache.
 */
const cache = new NodeCache({
  stdTTL: Number(process.env.CACHE_TTL) || 60,
  checkperiod: 120,
  useClones: true
});

// Request-level counters (node-cache's own stats count every internal get call)
const counters = { hits: 0, misses: 0 };

const LIST_KEY_PREFIX = 'tasks:all:';

const listKey = (req) => `${LIST_KEY_PREFIX}${req.user.id}:${req.originalUrl}`;
const itemKey = (req) => `task:${req.params.id}`;

const recordHit = () => { counters.hits++; };
const recordMiss = () => { counters.misses++; };

const getStats = () => {
  const totalRequests = counters.hits + counters.misses;
  const hitRatio = totalRequests === 0 ? 0 : (counters.hits / totalRequests) * 100;

  return {
    hits: counters.hits,
    misses: counters.misses,
    totalRequests,
    hitRatio: `${hitRatio.toFixed(2)}%`,
    cachedKeys: cache.keys(),
    stats: cache.getStats()
  };
};

const flushAll = () => {
  cache.flushAll();
  counters.hits = 0;
  counters.misses = 0;
};

/**
 * Drops every cached task list (for all users, since an admin's ?all=true list
 * contains other users' tasks) and, when an id is given, that single task.
 */
const invalidateTaskCache = (id) => {
  const keys = cache.keys().filter((key) => key.startsWith(LIST_KEY_PREFIX));

  if (id) {
    keys.push(`task:${id}`);
  }

  return cache.del(keys);
};

module.exports = {
  cache,
  listKey,
  itemKey,
  recordHit,
  recordMiss,
  getStats,
  flushAll,
  invalidateTaskCache
};
