const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', new Date().toISOString(), err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    error: message,
    code: code,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
};

module.exports = { errorHandler };
