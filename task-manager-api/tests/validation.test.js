const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runMiddleware } = require('./helpers');
const validateTask = require('../middleware/validateTask');
const validateAuthInput = require('../middleware/validateAuthInput');
const validateObjectId = require('../middleware/validateObjectId');

describe('validateTask middleware', () => {
  it('accepts a valid task and trims title/description', async () => {
    const req = { body: { title: '  Write tests  ', description: ' CI ', priority: 'high' } };
    const { nextCalled } = await runMiddleware(validateTask(), req);
    assert.equal(nextCalled, true);
    assert.equal(req.body.title, 'Write tests');
    assert.equal(req.body.description, 'CI');
  });

  it('rejects a missing title with 400 and field details', async () => {
    const { nextCalled, res } = await runMiddleware(validateTask(), { body: { priority: 'low' } });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.details.title, /required/);
  });

  it('rejects unknown priority and status values', async () => {
    const { res } = await runMiddleware(validateTask(), { body: { title: 'x', priority: 'urgent', status: 'done' } });
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.details.priority);
    assert.ok(res.body.details.status);
  });

  it('allows partial updates without a title (PUT)', async () => {
    const { nextCalled } = await runMiddleware(validateTask({ partial: true }), { body: { status: 'completed' } });
    assert.equal(nextCalled, true);
  });
});

describe('validateAuthInput middleware', () => {
  it('normalises the email to lower case', async () => {
    const req = { body: { email: '  Student@Example.TEST ', password: 'secret123' } };
    const { nextCalled } = await runMiddleware(validateAuthInput(), req);
    assert.equal(nextCalled, true);
    assert.equal(req.body.email, 'student@example.test');
  });

  it('enforces a minimum password length on registration only', async () => {
    const short = { body: { email: 'a@b.co', password: '123' } };
    assert.equal((await runMiddleware(validateAuthInput(), short)).res.statusCode, 400);
    const login = { body: { email: 'a@b.co', password: '123' } };
    assert.equal((await runMiddleware(validateAuthInput({ requireMinLength: false }), login)).nextCalled, true);
  });
});

describe('validateObjectId middleware', () => {
  it('passes a valid ObjectId and rejects a malformed one', async () => {
    const ok = await runMiddleware(validateObjectId, { params: { id: '6adae3bb1b4c5d78633bea7e' } });
    assert.equal(ok.nextCalled, true);
    const bad = await runMiddleware(validateObjectId, { params: { id: 'not-an-id' } });
    assert.equal(bad.res.statusCode, 400);
  });
});
