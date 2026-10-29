require('./helpers');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { registerHandler, enqueue, getJob, getDeadLetterQueue } = require('../jobs/jobQueue');

const user = { id: 'u-ci', email: 'ci@example.test', role: 'user' };

const waitFor = async (id, statuses, timeoutMs = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = getJob(id);
    if (statuses.includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`job ${id} did not reach ${statuses} in ${timeoutMs} ms`);
};

describe('Async job queue (Practical 10)', () => {
  it('enqueue() returns immediately with status "queued", then a worker completes it', async () => {
    registerHandler('ci_echo', async (job, progress) => {
      progress(50, 'halfway');
      return { echoed: job.params.value };
    });

    const accepted = enqueue('ci_echo', { value: 7 }, user);
    assert.equal(accepted.status, 'queued');

    const job = await waitFor(accepted.id, ['completed']);
    assert.deepEqual(job.result, { echoed: 7 });
    assert.equal(job.progress, 100);
  });

  it('retries a failing job with backoff and moves it to the DLQ after max attempts', async () => {
    let calls = 0;
    registerHandler('ci_always_fails', async () => {
      calls++;
      throw new Error('downstream unavailable');
    });

    const accepted = enqueue('ci_always_fails', {}, user);
    const job = await waitFor(accepted.id, ['failed']);

    assert.equal(calls, 3);
    assert.equal(job.attempts, 3);
    assert.ok(getDeadLetterQueue().some((dead) => dead.id === accepted.id));
  });

  it('rejects an unregistered job type with a 400-style error', () => {
    assert.throws(() => enqueue('does_not_exist', {}, user), (err) => err.statusCode === 400);
  });
});
