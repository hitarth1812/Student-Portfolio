const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { runMiddleware } = require('./helpers');
const auth = require('../middleware/auth');

const sign = (payload, options = { expiresIn: '1h' }) => jwt.sign(payload, process.env.JWT_SECRET, options);
const withToken = (token) => ({ headers: { authorization: `Bearer ${token}` } });

describe('JWT auth middleware', () => {
  it('rejects a request without an Authorization header', async () => {
    const { nextCalled, res } = await runMiddleware(auth, { headers: {} });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = jwt.sign({ id: 'u1' }, 'attacker-secret');
    const { res } = await runMiddleware(auth, withToken(forged));
    assert.equal(res.statusCode, 401);
    assert.match(res.body.error, /invalid token/);
  });

  it('reports an expired token as a session expiry', async () => {
    const expired = sign({ id: 'u1' }, { expiresIn: -10 });
    const { res } = await runMiddleware(auth, withToken(expired));
    assert.equal(res.statusCode, 401);
    assert.match(res.body.error, /Session expired/);
  });

  it('attaches the decoded user (default role "user") for a valid token', async () => {
    const req = withToken(sign({ id: 'u42', email: 'student@example.test' }));
    const { nextCalled } = await runMiddleware(auth, req);
    assert.equal(nextCalled, true);
    assert.deepEqual(req.user, { id: 'u42', email: 'student@example.test', role: 'user' });
  });
});
