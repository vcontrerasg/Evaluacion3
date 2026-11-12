const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const { revokeAllForUser } = require('../services/token.service');
const { BCRYPT_ROUNDS } = require('./auth.controller');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function adminList(req, res, next) {
  try {
    const { page, limit, search, role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      const pattern = mongoose.trusted({ $regex: escapeRegex(search), $options: 'i' });
      filter.$or = [{ name: pattern }, { email: pattern }];
    }
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter)
    ]);
    res.json({ users: items.map((u) => u.toPublic()), page, limit, total });
  } catch (err) {
    next(err);
  }
}

async function adminCreate(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (await User.exists({ email })) throw new AppError(409, 'Ya existe una cuenta con ese correo', 'email_taken');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role });
    res.status(201).json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
}

async function adminUpdate(req, res, next) {
  try {
    const target = await User.findById(req.params.id);
    if (!target) throw new AppError(404, 'Usuario no encontrado', 'user_not_found');

    if (target._id.toString() === req.user._id.toString()) {
      throw new AppError(400, 'No puedes modificar el rol ni el estado de tu propia cuenta', 'self_modification');
    }

    const losesAdmin =
      target.role === 'admin' &&
      target.active &&
      ((req.body.role && req.body.role !== 'admin') || req.body.active === false);

    if (losesAdmin) {
      const activeAdmins = await User.countDocuments({ role: 'admin', active: true });
      if (activeAdmins <= 1) {
        throw new AppError(409, 'Debe existir al menos un administrador activo', 'last_admin');
      }
    }

    if (req.body.role !== undefined) target.role = req.body.role;
    if (req.body.active !== undefined) target.active = req.body.active;
    await target.save();

    if (req.body.active === false || req.body.role !== undefined) await revokeAllForUser(target._id);

    res.json({ user: target.toPublic() });
  } catch (err) {
    next(err);
  }
}

module.exports = { adminList, adminCreate, adminUpdate };
