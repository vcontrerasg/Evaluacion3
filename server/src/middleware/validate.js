const AppError = require('../utils/AppError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || source;
        if (!fields[key]) fields[key] = issue.message;
      }
      const err = new AppError(400, 'Los datos enviados no son válidos', 'validation_error');
      err.fields = fields;
      return next(err);
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
