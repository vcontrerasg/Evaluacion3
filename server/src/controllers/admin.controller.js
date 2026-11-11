const User = require('../models/User');

async function summary(req, res, next) {
  try {
    const [total, admins, active] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ active: true })
    ]);
    res.json({ users: { total, admins, active } });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary };
