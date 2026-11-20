require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databasePath: process.env.DATABASE_PATH || './data/frikiquest.db',
  minPasswordLength: 8,
  maxNameLength: 100,
  // "Today" for daily logs and events is computed in this time zone.
  timezone: process.env.APP_TIMEZONE || 'Europe/Madrid',
  xpPerItem: 10,
  maxEventImageChars: 1400000, // ~1MB image as base64 data URL
};
