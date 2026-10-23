const express = require('express');
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');
const validateJson = require('../middleware/validateJson');
const { enqueue, getJob, listJobs, publicJob, getQueueStats, getDeadLetterQueue } = require('../jobs/jobQueue');
const { EXPORT_DIR } = require('../jobs/jobHandlers');

router.use(auth);

const canAccess = (job, user) =>
  job && (job.owner === user.id || user.role === 'admin' || user.role === 'manager');

// POST /api/jobs - enqueue a background job and answer 202 Accepted immediately
router.post('/', validateJson, (req, res, next) => {
  try {
    const { type, params } = req.body || {};

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ success: false, error: 'Job "type" is required' });
    }

    const job = enqueue(type, params, req.user);
    const statusUrl = `/api/jobs/${job.id}`;

    res
      .status(202)
      .location(statusUrl)
      .json({
        success: true,
        message: 'Job accepted for asynchronous processing',
        data: job,
        _links: { status: { href: statusUrl, method: 'GET' } }
      });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// GET /api/jobs - the caller's jobs (every job for admin / manager)
router.get('/', (req, res) => {
  const jobs = listJobs(req.user);
  res.status(200).json({ success: true, count: jobs.length, stats: getQueueStats(), data: jobs });
});

// GET /api/jobs/dlq - jobs that exhausted their retries
router.get('/dlq', (req, res) => {
  const isElevated = req.user.role === 'admin' || req.user.role === 'manager';
  const dlq = getDeadLetterQueue().filter((job) => isElevated || job.owner === req.user.id);
  res.status(200).json({ success: true, count: dlq.length, data: dlq });
});

// GET /api/jobs/:id - poll a single job's status
router.get('/:id', (req, res) => {
  const job = getJob(req.params.id);

  if (!canAccess(job, req.user)) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  res.status(200).json({ success: true, data: publicJob(job) });
});

// GET /api/jobs/:id/download - the CSV produced by a completed export_csv job
router.get('/:id/download', (req, res) => {
  const job = getJob(req.params.id);

  if (!canAccess(job, req.user) || job.type !== 'export_csv') {
    return res.status(404).json({ success: false, error: 'Export not found' });
  }

  if (job.status !== 'completed') {
    return res.status(409).json({ success: false, error: `Export is not ready (status: ${job.status})` });
  }

  res.download(path.join(EXPORT_DIR, job.result.fileName), `tasks-export-${job.id}.csv`);
});

module.exports = router;
