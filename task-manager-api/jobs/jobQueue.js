const crypto = require('crypto');
const { publish, TOPICS } = require('../events/eventBus');

/**
 * In-memory Async Job Queue (Practical 10)
 * POST /api/jobs only enqueues and answers 202 Accepted; the work itself is
 * picked up later by a small pool of background workers. A failing job is
 * retried with exponential backoff and, once attempts run out, it is moved to
 * the Dead Letter Queue (DLQ) so it can be inspected instead of silently lost.
 */
const CONCURRENCY = Number(process.env.JOB_CONCURRENCY) || 2;
const MAX_ATTEMPTS = Number(process.env.JOB_MAX_ATTEMPTS) || 3;
const BASE_BACKOFF_MS = 400;

const handlers = {};
const jobs = new Map();
const pending = [];
const deadLetterQueue = [];
let active = 0;

const newJobId = () => `job-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

const registerHandler = (type, handler) => {
  handlers[type] = handler;
};

const publicJob = (job) => ({
  id: job.id,
  type: job.type,
  status: job.status,
  attempts: job.attempts,
  maxAttempts: job.maxAttempts,
  progress: job.progress,
  result: job.result,
  error: job.error,
  owner: job.owner,
  createdAt: job.createdAt,
  startedAt: job.startedAt,
  finishedAt: job.finishedAt,
  durationMs: job.durationMs
});

const enqueue = (type, params, user) => {
  if (!handlers[type]) {
    const err = new Error(`Unknown job type "${type}". Allowed: ${Object.keys(handlers).join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const job = {
    id: newJobId(),
    type,
    params: params || {},
    owner: user.id,
    actor: user.email,
    status: 'queued',
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    progress: 0,
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    durationMs: null
  };

  jobs.set(job.id, job);
  pending.push(job);

  publish(TOPICS.JOB_ENQUEUED, { jobId: job.id, type }, { actor: job.actor, userId: job.owner });

  // Defer the pump so the 202 response is written before any work starts
  setImmediate(pump);

  return publicJob(job);
};

const pump = () => {
  while (active < CONCURRENCY && pending.length > 0) {
    const job = pending.shift();
    active++;
    run(job).finally(() => {
      active--;
      setImmediate(pump);
    });
  }
};

const run = async (job) => {
  job.status = 'processing';
  job.attempts++;
  job.startedAt = job.startedAt || new Date().toISOString();

  publish(TOPICS.JOB_STARTED, { jobId: job.id, type: job.type, attempt: job.attempts }, { actor: job.actor, userId: job.owner });

  const reportProgress = (progress, message) => {
    job.progress = progress;
    publish(TOPICS.JOB_PROGRESS, { jobId: job.id, progress, message }, { actor: job.actor, userId: job.owner });
  };

  try {
    job.result = await handlers[job.type](job, reportProgress);
    job.status = 'completed';
    job.progress = 100;
    job.error = null;
    job.finishedAt = new Date().toISOString();
    job.durationMs = Date.now() - new Date(job.startedAt).getTime();

    publish(TOPICS.JOB_COMPLETED, {
      jobId: job.id,
      type: job.type,
      durationMs: job.durationMs,
      owner: job.owner
    }, { actor: job.actor, userId: job.owner });
  } catch (err) {
    job.error = err.message;

    if (job.attempts < job.maxAttempts) {
      const delay = BASE_BACKOFF_MS * 2 ** (job.attempts - 1);
      job.status = 'retrying';

      publish(TOPICS.JOB_RETRY, {
        jobId: job.id,
        attempt: job.attempts,
        nextAttemptInMs: delay,
        error: err.message
      }, { actor: job.actor, userId: job.owner });

      setTimeout(() => {
        pending.push(job);
        pump();
      }, delay);
    } else {
      job.status = 'failed';
      job.finishedAt = new Date().toISOString();
      job.durationMs = Date.now() - new Date(job.startedAt).getTime();
      deadLetterQueue.push({ ...publicJob(job), movedToDlqAt: job.finishedAt });

      publish(TOPICS.JOB_FAILED, {
        jobId: job.id,
        type: job.type,
        attempts: job.attempts,
        error: err.message,
        owner: job.owner
      }, { actor: job.actor, userId: job.owner });
    }
  }
};

const getJob = (id) => jobs.get(id);

const listJobs = (user) => {
  const isElevated = user.role === 'admin' || user.role === 'manager';
  return [...jobs.values()]
    .filter((job) => isElevated || job.owner === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicJob);
};

const getQueueStats = () => ({
  concurrency: CONCURRENCY,
  maxAttempts: MAX_ATTEMPTS,
  activeWorkers: active,
  queued: pending.length,
  total: jobs.size,
  completed: [...jobs.values()].filter((j) => j.status === 'completed').length,
  failed: [...jobs.values()].filter((j) => j.status === 'failed').length,
  dlqCount: deadLetterQueue.length,
  registeredTypes: Object.keys(handlers)
});

const getDeadLetterQueue = () => [...deadLetterQueue];

module.exports = {
  registerHandler,
  enqueue,
  getJob,
  listJobs,
  publicJob,
  getQueueStats,
  getDeadLetterQueue
};
