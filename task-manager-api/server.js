require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db'); // also maps MONGODB_URI -> MONGO_URI
const migrateData = require('./config/migrateData');
const app = require('./app');
const eventRoutes = require('./routes/eventRoutes');

const PORT = process.env.PORT || 5000;

// Fail fast at boot rather than at the first login attempt
for (const key of ['JWT_SECRET', 'MONGO_URI']) {
  if (!process.env[key]) {
    console.error(`[Config] ${key} is missing. Add it to your .env file (or the host's environment variables) before starting the server.`);
    process.exit(1);
  }
}

// Connect to MongoDB and run safe backward-compatibility migrations
connectDB().then(() => {
  migrateData();
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// `docker stop` sends SIGTERM: finish in-flight requests and close MongoDB
// cleanly instead of being killed after the 10 s grace period.
const shutdown = (signal) => {
  console.log(`[Server] ${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await mongoose.connection.close();
    console.log('[Server] HTTP server and MongoDB connection closed');
    process.exit(0);
  });
  // Long-lived SSE streams and idle keep-alive sockets (pooled by the Nginx proxy)
  // would otherwise hold close() open until the fallback timer fires
  const streams = eventRoutes.closeAllStreams();
  if (streams) console.log(`[Server] Closed ${streams} open SSE stream(s)`);
  server.closeIdleConnections();
  // Hard cap in case a request is still in flight
  setTimeout(() => process.exit(0), 5000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
