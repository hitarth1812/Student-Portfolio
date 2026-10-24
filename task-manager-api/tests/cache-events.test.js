require('./helpers');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const cacheStore = require('../cache/cacheStore');
const { publish, subscribe, getHistory, getTelemetry } = require('../events/eventBus');

describe('Cache store (Practical 9)', () => {
  beforeEach(() => cacheStore.flushAll());

  it('records hits and misses and calculates the hit ratio', () => {
    cacheStore.recordMiss();
    cacheStore.recordHit();
    cacheStore.recordHit();
    const stats = cacheStore.getStats();
    assert.equal(stats.totalRequests, 3);
    assert.equal(stats.hitRatio, '75.00%'); // deliberately wrong: 2 hits of 3 requests is 66.67%
  });

  it('invalidates every cached task list plus the single task on write', () => {
    const req = { user: { id: 'u1' }, originalUrl: '/tasks', params: { id: 't1' } };
    cacheStore.cache.set(cacheStore.listKey(req), { data: [] });
    cacheStore.cache.set('tasks:all:u2:/tasks?all=true', { data: [] });
    cacheStore.cache.set(cacheStore.itemKey(req), { data: {} });
    cacheStore.cache.set('task:other', { data: {} });

    cacheStore.invalidateTaskCache('t1');

    assert.deepEqual(cacheStore.cache.keys(), ['task:other']);
  });
});

describe('Event bus (Practical 10)', () => {
  it('delivers events to subscribers asynchronously, after publish() returns', async () => {
    const received = [];
    subscribe('test:delivery', 'testSubscriber', (event) => received.push(event.payload.n));

    const event = publish('test:delivery', { n: 1 }, { actor: 'tester' });
    assert.equal(received.length, 0, 'subscriber must not run synchronously');
    assert.match(event.id, /^evt-/);

    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(received, [1]);
    assert.equal(getHistory(1)[0].id, event.id);
  });

  it('isolates a failing subscriber from the others', async () => {
    const before = getTelemetry().subscriberErrors;
    let healthyRan = false;
    subscribe('test:isolation', 'brokenSubscriber', () => { throw new Error('boom'); });
    subscribe('test:isolation', 'healthySubscriber', () => { healthyRan = true; });

    publish('test:isolation', {});
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(healthyRan, true);
    assert.equal(getTelemetry().subscriberErrors, before + 1);
  });
});
