const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const User = require('../models/User');
const tokens = require('../services/token.service');

const BCRYPT_ROUNDS = env.isTest ? 4 : 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync('contrasena-ficticia-para-igualar-tiempos', BCRYPT_ROUNDS);

async function startSession(res, user) {
  const accessToken = tokens.signAccessToken(user);
  const refresh = await tokens.issueRefreshToken(user._id);
  tokens.setRefreshCookie(res, refresh.raw, refresh.expiresAt);
  return accessToken;
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const exists = await User.exists({ email });
    if (exists) throw new AppError(409, 'Ya existe una cuenta con ese correo', 'email_taken');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role: 'user' });

    const accessToken = await startSession(res, user);
    res.status(201).json({ user: user.toPublic(), accessToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash +failedAttempts +lockUntil');

    if (user && user.lockUntil && user.lockUntil > new Date()) {
      throw new AppError(423, 'La cuenta está bloqueada temporalmente. Intenta más tarde', 'account_locked');
    }

    const hash = user ? user.passwordHash : DUMMY_HASH;
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid || !user.active) {
      if (user && !valid) {
        user.failedAttempts = (user.failedAttempts || 0) + 1;
        if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
          user.failedAttempts = 0;
        }
        await user.save();
      }
      throw new AppError(401, 'Correo o contraseña incorrectos', 'invalid_credentials');
    }

    user.failedAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = await startSession(res, user);
    res.json({ user: user.toPublic(), accessToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const raw = req.cookies && req.cookies[tokens.REFRESH_COOKIE];
    if (!raw || typeof raw !== 'string') {
      throw new AppError(401, 'No hay una sesión activa', 'refresh_missing');
    }

    const record = await tokens.consumeRefreshToken(raw);
    if (!record) {
      tokens.clearRefreshCookie(res);
      throw new AppError(401, 'La sesión expiró. Vuelve a iniciar sesión', 'refresh_invalid');
    }

    const user = await User.findById(record.user);
    if (!user || !user.active) {
      tokens.clearRefreshCookie(res);
      throw new AppError(401, 'La sesión expiró. Vuelve a iniciar sesión', 'refresh_invalid');
    }

    const accessToken = await startSession(res, user);
    res.json({ user: user.toPublic(), accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const raw = req.cookies && req.cookies[tokens.REFRESH_COOKIE];
    if (raw && typeof raw === 'string') await tokens.revokeRefreshToken(raw);
    tokens.clearRefreshCookie(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  res.json({ user: req.user.toPublic() });
}

module.exports = { register, login, refresh, logout, me, BCRYPT_ROUNDS };
