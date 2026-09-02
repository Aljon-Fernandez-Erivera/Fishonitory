require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'fishonitory_secret_key_2026',
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;