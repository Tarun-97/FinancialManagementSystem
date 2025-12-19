export function errorHandler(err, _req, res, _next) {
  if (res.headersSent) return;
  const status = err.status || 500;
  const body = {
    error: err.error || (status === 400 ? "ValidationError" : status === 404 ? "NotFound" : "ServerError"),
    message: err.message || "Internal server error"
  };
  if (err.details) body.details = err.details;
  res.status(status).json(body);
}
