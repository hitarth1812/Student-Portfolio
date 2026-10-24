const { EventEmitter } = require('events');
const crypto = require('crypto');

/**
 * Event Bus (Practical 10)
 * A single in-process publish/subscribe channel built on Node's EventEmitter.
 * Publishers (controllers, job workers) only call publish(topic, payload); they
 * never know which subscribers exist. Subscribers register with subscribe() and
 * each one runs in isolation, so a crashing subscriber cannot break the request
 * that produced the event or any other subscriber.
 */
const TOPICS = Object.freeze({
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_STATUS_CHANGED: 'task:status_changed',
  TASK_DELETED: 'task:deleted',
  TASK_HIGH_PRIORITY: 'task:high_priority_alert',
  USER_REGISTERED: 'user:registered',
  USER_LOGGED_IN: 'user:logged_in',
  JOB_ENQUEUED: 'job:enqueued',
  JOB_STARTED: 'job:started',
  JOB_PROGRESS: 'job:progress',
  JOB_RETRY: 'job:retry',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
  NOTIFICATION_DISPATCHED: 'notification:dispatched',
  AUDIT_LOGGED: 'audit:logged'
});

const HISTORY_LIMIT = 200;

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

// Wildcard listeners (e.g. the SSE broadcaster) receive every event
const wildcardListeners = new Set();

const history = [];
const telemetry = {
  totalEmitted: 0,
  byTopic: {},
  subscriberErrors: 0,
  totalHandlerMs: 0,
  handlerRuns: 0
};

const newEventId = () => `evt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

/**
 * Registers a subscriber for one topic. The handler is wrapped so that it runs
 * asynchronously (setImmediate) and its errors are contained and counted.
 */
const subscribe = (topic, name, handler) => {
  const wrapped = (event) => {
    setImmediate(async () => {
      const start = process.hrtime.bigint();
      try {
        await handler(event);
      } catch (err) {
        telemetry.subscriberErrors++;
        console.error(`[EventBus] subscriber "${name}" failed on ${event.topic}: ${err.message}`);
      } finally {
        telemetry.totalHandlerMs += Number(process.hrtime.bigint() - start) / 1e6;
        telemetry.handlerRuns++;
      }
    });
  };

  wrapped.subscriberName = name;
  emitter.on(topic, wrapped);
};

const subscribeAll = (handler) => {
  wildcardListeners.add(handler);
  return () => wildcardListeners.delete(handler);
};

/**
 * Publishes a domain event. Returns immediately: subscribers run on a later tick,
 * so the HTTP response that triggered the event is never held up by them.
 */
const publish = (topic, payload = {}, meta = {}) => {
  const event = {
    id: newEventId(),
    topic,
    payload,
    actor: meta.actor || 'system',
    userId: meta.userId || null,
    timestamp: new Date().toISOString()
  };

  telemetry.totalEmitted++;
  telemetry.byTopic[topic] = (telemetry.byTopic[topic] || 0) + 1;

  history.unshift(event);
  if (history.length > HISTORY_LIMIT) {
    history.pop();
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log(`[EventBus] ${event.timestamp} ${topic} ${event.id} actor=${event.actor}`);
  }

  emitter.emit(topic, event);
  wildcardListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      telemetry.subscriberErrors++;
    }
  });

  return event;
};

const getHistory = (limit = 50) => history.slice(0, limit);

const getBindings = () =>
  Object.values(TOPICS).map((topic) => ({
    topic,
    listeners: emitter.listenerCount(topic),
    subscribers: emitter.listeners(topic).map((fn) => fn.subscriberName || 'anonymous')
  }));

const getTelemetry = () => ({
  totalEmitted: telemetry.totalEmitted,
  byTopic: { ...telemetry.byTopic },
  subscriberErrors: telemetry.subscriberErrors,
  avgHandlerMs: telemetry.handlerRuns
    ? Number((telemetry.totalHandlerMs / telemetry.handlerRuns).toFixed(2))
    : 0,
  liveConnections: wildcardListeners.size
});

module.exports = {
  TOPICS,
  publish,
  subscribe,
  subscribeAll,
  getHistory,
  getBindings,
  getTelemetry
};
