const env = require('../config/env');

function notFound(req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'Recurso no encontrado' } });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'invalid_json', message: 'El cuerpo de la solicitud no es JSON válido' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'payload_too_large', message: 'La solicitud es demasiado grande' } });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: { code: 'duplicate', message: 'El registro ya existe' } });
  }

  if (err.expose) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.fields) body.error.fields = err.fields;
    return res.status(err.status || 400).json(body);
  }

  if (!env.isTest) console.error(`[error] ${req.method} ${req.originalUrl} ${err.name}`);
  return res.status(500).json({ error: { code: 'internal_error', message: 'Ocurrió un error inesperado. Intenta nuevamente' } });
}

module.exports = { notFound, errorHandler };
