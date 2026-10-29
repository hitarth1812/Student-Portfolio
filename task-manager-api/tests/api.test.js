require('./helpers');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../app');

/**
 * HTTP-level tests against the real Express app on an ephemeral port.
 * No MongoDB is started, so these cover everything that is decided before the
 * database: routing, auth, validation, health reporting and error envelopes.
 */
let server;
let base;
const token = jwt.sign({ id: '6adae3ba1b4c5d78633bea7c', email: 'ci@example.test', role: 'user' }, process.env.JWT_SECRET);

const call = async (method, path, { body, auth = false, contentType = 'application/json' } = {}) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = contentType;
  if (auth) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : body });
  return { status: res.status, body: await res.json().catch(() => null) };
};

describe('REST API (HTTP)', () => {
  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections(); // fetch keeps sockets alive; don't wait for their timeout
  }));

  it('GET / lists the available endpoints', async () => {
    const { status, body } = await call('GET', '/');
    assert.equal(status, 200);
    assert.ok(body.endpoints.health);
  });

  it('GET /health reports 503 "degraded" while MongoDB is not connected', async () => {
    const { status, body } = await call('GET', '/health');
    assert.equal(status, 503);
    assert.equal(body.status, 'degraded');
    assert.equal(body.db, 'disconnected');
  });

  it('protected routes answer 401 without a token', async () => {
    assert.equal((await call('GET', '/tasks')).status, 401);
    assert.equal((await call('GET', '/api/jobs')).status, 401);
  });

  it('rejects a non-JSON body with 415 before reaching the controller', async () => {
    const { status } = await call('POST', '/tasks', { body: 'title=x', auth: true, contentType: 'text/plain' });
    assert.equal(status, 415);
  });

  it('rejects an invalid task payload with 400', async () => {
    const { status, body } = await call('POST', '/tasks', { body: JSON.stringify({ title: '' }), auth: true });
    assert.equal(status, 400);
    assert.equal(body.error, 'Validation Error');
  });

  it('rejects an unknown background job type with 400', async () => {
    const { status, body } = await call('POST', '/api/jobs', { body: JSON.stringify({ type: 'mine_bitcoin' }), auth: true });
    assert.equal(status, 400);
    assert.match(body.error, /Unknown job type/);
  });

  it('AI suggest requires authentication and a meaningful title', async () => {
    assert.equal((await call('POST', '/api/ai/suggest', { body: JSON.stringify({ title: 'Fix bug' }) })).status, 401);
    assert.equal((await call('POST', '/api/ai/suggest', { body: JSON.stringify({ title: 'x' }), auth: true })).status, 400);
  });

  it('AI suggest still answers (rule-based fallback) when no AI key is configured', async () => {
    const { status, body } = await call('POST', '/api/ai/suggest', { body: JSON.stringify({ title: 'Urgent: fix login bug' }), auth: true });
    assert.equal(status, 200);
    assert.equal(body.data.source, 'fallback');
    assert.equal(body.data.priority, 'high');
    assert.match(body.disclaimer, /Rule-based suggestion .*Review/);
  });

  it('AI status never exposes the API key', async () => {
    const { status, body } = await call('GET', '/api/ai/status', { auth: true });
    assert.equal(status, 200);
    assert.equal(body.data.configured, false);
    assert.doesNotMatch(JSON.stringify(body), /key-|AIza|sk-/);
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const { status, body } = await call('GET', '/does-not-exist');
    assert.equal(status, 404);
    assert.equal(body.success, false);
  });
});
