const rateLimit = require('express-rate-limit');
const env = require('../config/env');

function limiter(windowMinutes, max, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: env.isTest ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message } })
  });
}

const apiLimiter = limiter(15, 300, 'Demasiadas solicitudes. Intenta nuevamente en unos minutos');
const authLimiter = limiter(15, 20, 'Demasiados intentos de acceso. Intenta nuevamente en unos minutos');

module.exports = { apiLimiter, authLimiter };
