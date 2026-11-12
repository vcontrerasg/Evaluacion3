const AppError = require('../utils/AppError');

function validateObjectId(param = 'id') {
  return (req, res, next) => {
    const value = req.params[param];
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
      return next(new AppError(400, 'Identificador inválido', 'invalid_id'));
    }
    return next();
  };
}

module.exports = validateObjectId;
