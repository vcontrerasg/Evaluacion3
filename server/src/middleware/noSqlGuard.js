const AppError = require('../utils/AppError');

function hasForbiddenKeys(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return false;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) return true;
    if (hasForbiddenKeys(value[key], depth + 1)) return true;
  }
  return false;
}

function noSqlGuard(req, res, next) {
  if (hasForbiddenKeys(req.body) || hasForbiddenKeys(req.query) || hasForbiddenKeys(req.params)) {
    return next(new AppError(400, 'La solicitud contiene caracteres no permitidos', 'invalid_input'));
  }
  return next();
}

module.exports = noSqlGuard;
