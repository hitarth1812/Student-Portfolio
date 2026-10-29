const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');
const { registerHandler } = require('./jobQueue');

/**
 * Background job handlers. Each one receives the job and a progress reporter
 * and returns the result object stored on the job. The small sleeps stand in
 * for slow work (report rendering, a remote API) so the async flow is visible.
 */
const { EXPORT_DIR } = require('../config/paths');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const csvCell = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// export_csv - writes the owner's tasks to exports/<jobId>.csv
registerHandler('export_csv', async (job, progress) => {
  progress(10, 'Querying tasks from MongoDB...');
  const tasks = await Task.find({ user: job.owner }).sort({ createdAt: -1 }).lean();
  await sleep(500);

  progress(50, `Serialising ${tasks.length} tasks to CSV...`);
  const header = 'id,title,description,status,priority,createdAt';
  const rows = tasks.map((t) =>
    [t._id, t.title, t.description, t.status, t.priority, new Date(t.createdAt).toISOString()]
      .map(csvCell)
      .join(',')
  );
  await sleep(500);

  progress(85, 'Writing export file...');
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const fileName = `${job.id}.csv`;
  await fs.promises.writeFile(path.join(EXPORT_DIR, fileName), [header, ...rows].join('\n') + '\n');

  return { fileName, rows: tasks.length, downloadUrl: `/api/jobs/${job.id}/download` };
});

// task_report - aggregates the owner's tasks by status and priority
registerHandler('task_report', async (job, progress) => {
  progress(20, 'Aggregating tasks by status and priority...');
  const tasks = await Task.find({ user: job.owner }).lean();
  await sleep(700);

  const count = (key) =>
    tasks.reduce((acc, t) => ({ ...acc, [t[key]]: (acc[t[key]] || 0) + 1 }), {});

  progress(80, 'Computing completion rate...');
  await sleep(300);
  const completed = tasks.filter((t) => t.status === 'completed').length;

  return {
    total: tasks.length,
    byStatus: count('status'),
    byPriority: count('priority'),
    completionRate: tasks.length ? `${((completed / tasks.length) * 100).toFixed(1)}%` : '0%'
  };
});

// simulate_failure - always throws, to demonstrate retry with backoff and the DLQ
registerHandler('simulate_failure', async (job, progress) => {
  progress(30, 'Simulating unstable remote microservice...');
  await sleep(300);
  throw new Error('Remote microservice timed out (simulated)');
});

module.exports = { EXPORT_DIR };
