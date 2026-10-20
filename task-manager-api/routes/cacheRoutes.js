const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getStats, flushAll } = require('../cache/cacheStore');

// Cache internals expose user ids in the keys, so both routes are protected
router.use(auth);

// GET /api/cache/debug - Hit/miss counters, hit ratio and the keys currently cached
router.get('/debug', (req, res) => {
  res.status(200).json({ success: true, data: getStats() });
});

// DELETE /api/cache - Flush every cached entry and reset the counters
router.delete('/', (req, res) => {
  flushAll();
  res.status(200).json({ success: true, message: 'Cache flushed successfully' });
});

module.exports = router;
