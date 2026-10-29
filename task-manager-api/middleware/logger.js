const fs = require('fs');
const path = require('path');

/**
 * Logger Middleware
 * Logs timestamp, HTTP method, and requested URL to the console, and appends
 * the same request as a row to logs.csv for lab evidence / auditing.
 */
const LOG_FILE = path.join(__dirname, '..', 'logs.csv');
const CSV_HEADER = 'timestamp,method,path,task_id\n';

// Ensure the file exists with a header the first time this module loads
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, CSV_HEADER);
}

const csvEscape = (value) => {
  if (value === undefined || value === null) return '';
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

// req.params isn't populated yet at this point in the pipeline (this runs
// before routing), so the id is pulled straight out of a /tasks/:id URL.
const OBJECT_ID_IN_PATH = /^\/tasks\/([a-fA-F0-9]{24})(?:\/|$)/;

const logger = (req, res, next) => {
  // Docker HEALTHCHECK probes run every 15 s; logging them would bury real traffic.
  // Automated tests (NODE_ENV=test) must not append to the committed logs.csv either.
  if (req.path === '/health' || process.env.NODE_ENV === 'test') {
    return next();
  }

  const timestamp = new Date().toISOString();
  const method = req.method;
  const requestPath = req.originalUrl || req.url;
  const idMatch = requestPath.match(OBJECT_ID_IN_PATH);
  const taskId = idMatch ? idMatch[1] : '';

  console.log(`[${timestamp}]\n${method} ${requestPath}`);

  const row = [timestamp, method, requestPath, taskId].map(csvEscape).join(',') + '\n';

  fs.appendFile(LOG_FILE, row, (err) => {
    if (err) {
      console.error('[Logger] Failed to write to logs.csv:', err.message);
    }
  });

  next();
};

module.exports = logger;
