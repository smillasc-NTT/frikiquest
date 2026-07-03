const config = require('../config');

const validators = {
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidPassword: (password) => password && password.length >= config.minPasswordLength,
  isValidName: (name) => name && name.trim().length > 0 && name.length <= config.maxNameLength,
  isValidResultValue: (value, type, minVal, maxVal) => {
    if (type === 'numeric') {
      const num = parseInt(value);
      if (isNaN(num) || num <= 0 || num > config.maxNumericValue) return false;
      if (minVal !== null && num < minVal) return false;
      if (maxVal !== null && num > maxVal) return false;
      return true;
    }
    if (type === 'boolean') {
      return value === 'true' || value === 'false' || value === true || value === false;
    }
    if (type === 'text') {
      return value && typeof value === 'string' && value.length > 0 && value.length <= config.maxTextResultLength;
    }
    return false;
  },
};

module.exports = validators;
