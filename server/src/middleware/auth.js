const AppError = require('../utils/AppError');
const User = require('../models/User');
const { verifyAccessToken } = require('../services/token.service');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'Debes iniciar sesión para continuar', 'token_missing');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError(401, 'La sesión expiró. Vuelve a iniciar sesión', 'token_expired');
      }
      throw new AppError(401, 'Credenciales de sesión inválidas', 'token_invalid');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.active) {
      throw new AppError(401, 'Credenciales de sesión inválidas', 'token_invalid');
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Debes iniciar sesión para continuar', 'token_missing'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'No tienes permisos para realizar esta acción', 'forbidden'));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
