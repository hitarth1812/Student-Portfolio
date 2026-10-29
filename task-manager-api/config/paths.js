const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Where the API writes its runtime files (request log, event/notification logs,
 * job exports). Locally and in Docker that is the project folder; on Vercel the
 * deployment is read-only except the temp dir, so the files go there instead
 * (they are per-instance and short-lived - MongoDB holds all real data).
 */
const DATA_DIR = process.env.DATA_DIR
  || (process.env.VERCEL ? path.join(os.tmpdir(), 'task-manager-api') : path.join(__dirname, '..'));

fs.mkdirSync(DATA_DIR, { recursive: true });

module.exports = {
  DATA_DIR,
  REQUEST_LOG: path.join(DATA_DIR, 'logs.csv'),
  LOG_DIR: path.join(DATA_DIR, 'logs'),
  EXPORT_DIR: path.join(DATA_DIR, 'exports')
};
