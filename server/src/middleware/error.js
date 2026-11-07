import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const notFound = (req, _res, next) =>
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

export function errorHandler(err, req, res, _next) {
  let error = err;

  if (error.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`);
  } else if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {}).join(', ');
    error = ApiError.conflict(`A record with this ${field || 'value'} already exists`);
  } else if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
    error = new ApiError(422, details[0]?.message || 'Validation failed', details);
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Invalid or expired token');
  }

  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} ->`, err.stack || err.message);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${error.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && env.isProd ? 'Something went wrong. Please try again.' : error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(env.isProd ? {} : { stack: statusCode >= 500 ? err.stack : undefined }),
  });
}
