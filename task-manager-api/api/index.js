/**
 * Vercel serverless entry point.
 * server.js (app.listen + process.exit on errors) is for Docker / local runs;
 * on Vercel every request comes through this handler instead. The MongoDB
 * connection is opened once per warm instance and reused by later requests.
 */
const mongoose = require('mongoose');
const app = require('../app');
const migrateData = require('../config/migrateData');

let ready = null;

// Plain Node response (Express helpers are not attached until app() runs)
const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const connect = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`[MongoDB] Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  await migrateData();
};

module.exports = async (req, res) => {
  const missing = ['MONGO_URI', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) {
    return sendJson(res, 500, {
      success: false,
      error: `Server misconfigured: ${missing.join(', ')} not set in the Vercel project's environment variables`
    });
  }

  try {
    ready = ready || connect();
    await ready;
  } catch (err) {
    ready = null; // let the next request retry instead of caching the failure
    console.error(`[MongoDB] Connection error: ${err.message}`);
    return sendJson(res, 503, { success: false, error: 'Database unavailable, please retry shortly' });
  }

  return app(req, res);
};
