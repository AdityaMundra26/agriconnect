export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Postgres error codes that are really client errors, not server faults.
const PG_CLIENT_ERRORS = {
  '22P02': [400, 'Invalid value in request (check ids and numeric fields)'],
  '22003': [400, 'A numeric value is out of range'],
  '23505': [409, 'That record already exists'],
  '23503': [400, 'Referenced record does not exist'],
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const pgMapped = err.code && PG_CLIENT_ERRORS[err.code];
  if (pgMapped) {
    return res.status(pgMapped[0]).json({ error: pgMapped[1] });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
}
