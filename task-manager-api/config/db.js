const mongoose = require('mongoose');

// Vercel's MongoDB Atlas integration names the variable MONGODB_URI; accept both
if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
  process.env.MONGO_URI = process.env.MONGODB_URI;
}

// Integration-generated URIs often have no database path, which would put
// everything in MongoDB's default "test" database
const mongoOptions = () =>
  /^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(process.env.MONGO_URI || '') ? {} : { dbName: 'task-manager' };

/**
 * Establishes connection to MongoDB using the URI from environment variables.
 * Exits the process on failure since the API cannot function without a database.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, mongoOptions());
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.mongoOptions = mongoOptions;
