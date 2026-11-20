const config = require('../config');

// Raster formats only: SVG can carry scripts and the image endpoint is public.
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

// Allowed values per daily-log category. Each item is a single "done" button.
const LOG_CATEGORIES = {
  training: ['done'],
  steps: ['done'],
  nutrition: ['done'],
};

const validators = {
  LOG_CATEGORIES,
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidPassword: (password) => password && password.length >= config.minPasswordLength,
  isValidName: (name) => name && name.trim().length > 0 && name.length <= config.maxNameLength,
  isValidLogEntry: (category, value) =>
    Object.prototype.hasOwnProperty.call(LOG_CATEGORIES, category) && LOG_CATEGORIES[category].includes(value),
  isValidImageDataUrl: (s) => typeof s === 'string' && s.length <= config.maxEventImageChars && IMAGE_DATA_URL.test(s),
};

module.exports = validators;
