const express = require('express');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const router = express.Router();
const auth = require('../middleware/auth');
const validateJson = require('../middleware/validateJson');
const { suggestTask, getStatus } = require('../services/aiService');
const { publish, TOPICS } = require('../events/eventBus');

/**
 * AI routes (Practical 13). The browser only ever talks to these endpoints;
 * the Gemini key stays in the server environment.
 */
const RATE_LIMIT = Number(process.env.AI_RATE_LIMIT_PER_MIN) || 10;
const WINDOW_MS = 60 * 1000;
const usage = new Map(); // userId -> timestamps in the current window

// Identical prompts within 10 minutes reuse the answer instead of paying for a new call
const suggestionCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const rateLimit = (req, res, next) => {
  const now = Date.now();
  const recent = (usage.get(req.user.id) || []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: `AI suggestion limit reached (${RATE_LIMIT} per minute). Try again in ${retryAfter}s.`
    });
  }

  recent.push(now);
  usage.set(req.user.id, recent);
  next();
};

router.use(auth);

// GET /api/ai/status - is the AI provider configured? (never exposes the key)
router.get('/status', (req, res) => {
  res.status(200).json({ success: true, data: { ...getStatus(), rateLimitPerMinute: RATE_LIMIT } });
});

// POST /api/ai/suggest - { title, description? } -> validated AI (or fallback) suggestion
router.post('/suggest', validateJson, rateLimit, async (req, res, next) => {
  try {
    const { title, description } = req.body || {};

    if (typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'A task title of at least 3 characters is required' });
    }
    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Description must be a string' });
    }

    const key = crypto.createHash('sha256').update(`${title.trim()}\n${(description || '').trim()}`).digest('hex');
    let suggestion = suggestionCache.get(key);
    const cached = Boolean(suggestion);

    if (!suggestion) {
      suggestion = await suggestTask({ title: title.trim(), description: (description || '').trim() });
      // Only cache real AI answers; a fallback should be retried next time
      if (suggestion.source === 'gemini') suggestionCache.set(key, suggestion);
    }

    // Audit trail: metadata only - the task text itself is never logged
    publish(TOPICS.AI_SUGGESTION, {
      source: suggestion.source,
      model: suggestion.model,
      latencyMs: suggestion.latencyMs,
      cached,
      redacted: suggestion.redacted,
      fallbackReason: suggestion.fallbackReason
    }, { actor: req.user.email, userId: req.user.id });

    res.status(200).json({
      success: true,
      data: { ...suggestion, cached },
      // Say truthfully where the suggestion came from
      disclaimer: suggestion.source === 'gemini'
        ? 'AI-generated suggestion. Review it before saving - it may be inaccurate.'
        : 'Rule-based suggestion (the AI service was not used). Review it before saving.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
