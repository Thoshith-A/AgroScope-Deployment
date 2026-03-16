/**
 * Central API error handler. Use next(err) in routes.
 * NotFoundException / MarketPriceNotFoundException → 404. ValidationError → 400.
 */
export function apiErrorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  const body = { success: false, message };
  if (process.env.NODE_ENV === 'development' && err.stack) body.stack = err.stack;
  res.status(status).json(body);
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
