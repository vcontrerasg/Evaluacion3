const AppError = require('../utils/AppError');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || 'body';
        if (!fields[key]) fields[key] = issue.message;
      }
      const err = new AppError(400, 'Los datos enviados no son válidos', 'validation_error');
      err.fields = fields;
      return next(err);
    }
    req.body = result.data;
    return next();
  };
}

module.exports = validate;
