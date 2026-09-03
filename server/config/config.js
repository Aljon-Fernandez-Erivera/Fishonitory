const path = require('path');
const dotenv = require('dotenv');

// Load backend env files explicitly.
// The root .env is allowed to override the server .env so edits in either file are picked up.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const config = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'fishonitory_secret_key_2026',
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Fail fast immediately if MONGODB_URI could not be read
if (!config.mongoURI) {
  console.error('\n FATAL: MONGODB_URI is undefined or missing in .env!');
  console.error(`Attempted resolution path: ${path.resolve(__dirname, '../.env')}\n`);
  process.exit(1);
}

module.exports = config;
