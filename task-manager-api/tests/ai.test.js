require('./helpers');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { suggestTask, redact, validateSuggestion, ruleBasedSuggestion } = require('../services/aiService');

/**
 * The AI service is tested against a fake fetch, so the suite is free, fast,
 * deterministic and runs in CI without any API key.
 */
const NOW = new Date('2026-10-24T10:00:00Z');

const geminiReply = (payload, status = 200) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => ({ candidates: [{ content: { parts: [{ text: typeof payload === 'string' ? payload : JSON.stringify(payload) }] } }] })
});

const VALID = {
  priority: 'high',
  dueInDays: 2,
  description: 'Fix the refresh-token bug so users stay logged in.',
  steps: ['Reproduce the 401', 'Patch token refresh', 'Add a regression test'],
  reasoning: 'Blocks every user after a refresh.'
};

describe('AI service - responsible AI safeguards (Practical 13)', () => {
  let savedKey;
  beforeEach(() => {
    savedKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key-not-real';
  });
  afterEach(() => {
    if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = savedKey;
  });

  it('redacts emails, phone numbers, API keys and passwords before data leaves the server', () => {
    const { text, redacted } = redact('Mail a@b.co, call 9876543210, key sk-abcdefghijklmnop, password: hunter2');
    assert.doesNotMatch(text, /a@b\.co|9876543210|sk-abcdef|hunter2/);
    assert.deepEqual(redacted.sort(), ['api_key', 'email', 'password', 'phone']);
  });

  it('sends only the redacted title/description to Gemini, with the key in a header', async () => {
    let sent;
    const fetchImpl = async (url, init) => {
      sent = { url, init };
      return geminiReply(VALID)();
    };
    await suggestTask({ title: 'Email prof@uni.edu about the bug' }, { fetchImpl, now: NOW });
    assert.doesNotMatch(sent.url, /key=/, 'API key must not be in the URL');
    assert.equal(sent.init.headers['x-goog-api-key'], 'test-key-not-real');
    assert.doesNotMatch(sent.init.body, /prof@uni\.edu/);
    assert.match(sent.init.body, /\[EMAIL REDACTED\]/);
  });

  it('returns a validated Gemini suggestion with a computed due date', async () => {
    const result = await suggestTask({ title: 'Fix login bug' }, { fetchImpl: geminiReply(VALID), now: NOW });
    assert.equal(result.source, 'gemini');
    assert.equal(result.priority, 'high');
    assert.equal(result.dueDate, '2026-10-26');
    assert.equal(result.steps.length, 3);
  });

  it('rejects out-of-range or malformed model output (never trusts it blindly)', () => {
    assert.equal(validateSuggestion({ ...VALID, priority: 'extreme' }), null);
    assert.equal(validateSuggestion({ ...VALID, dueInDays: 400 }), null);
    assert.equal(validateSuggestion({ ...VALID, steps: [] }), null);
    assert.equal(validateSuggestion('not an object'), null);
  });

  it('degrades gracefully: invalid JSON from the model falls back to rules', async () => {
    const result = await suggestTask({ title: 'Fix login bug' }, { fetchImpl: geminiReply('Sure! Here is a plan...'), now: NOW });
    assert.equal(result.source, 'fallback');
    assert.ok(result.fallbackReason);
  });

  it('degrades gracefully: HTTP 429/500 from the provider falls back to rules', async () => {
    const result = await suggestTask({ title: 'Fix login bug' }, { fetchImpl: geminiReply({}, 429), now: NOW });
    assert.equal(result.source, 'fallback');
    assert.match(result.fallbackReason, /HTTP 429/);
  });

  it('degrades gracefully: a network failure falls back to rules', async () => {
    const fetchImpl = async () => { throw new Error('getaddrinfo ENOTFOUND'); };
    const result = await suggestTask({ title: 'Prepare viva' }, { fetchImpl, now: NOW });
    assert.equal(result.source, 'fallback');
    assert.match(result.fallbackReason, /ENOTFOUND/);
  });

  it('works with no API key at all (feature stays usable)', async () => {
    delete process.env.GEMINI_API_KEY;
    const savedGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      const result = await suggestTask({ title: 'Urgent: submit report' }, { now: NOW });
      assert.equal(result.source, 'fallback');
      assert.match(result.fallbackReason, /No AI API key/);
    } finally {
      if (savedGoogle !== undefined) process.env.GOOGLE_API_KEY = savedGoogle;
    }
  });

  it('rule-based fallback maps urgency keywords to priority and due date', () => {
    assert.equal(ruleBasedSuggestion('Fix crash before deadline', '', NOW).priority, 'high');
    assert.equal(ruleBasedSuggestion('Research vector databases', '', NOW).priority, 'low');
    assert.equal(ruleBasedSuggestion('Fix crash before deadline', '', NOW).dueDate, '2026-10-25');
  });
});
