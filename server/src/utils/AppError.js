class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'error';
    this.expose = true;
  }
}

module.exports = AppError;
