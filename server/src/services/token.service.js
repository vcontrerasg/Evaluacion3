const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

const REFRESH_COOKIE = 'andes_rt';

function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: env.JWT_ACCESS_TTL,
    algorithm: 'HS256',
    issuer: 'andes-consultores'
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'andes-consultores'
  });
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: userId, tokenHash: hashToken(raw), expiresAt });
  return { raw, expiresAt };
}

async function consumeRefreshToken(raw) {
  return RefreshToken.findOneAndUpdate(
    { tokenHash: hashToken(raw), revokedAt: null, expiresAt: mongoose.trusted({ $gt: new Date() }) },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );
}

async function revokeRefreshToken(raw) {
  await RefreshToken.updateOne({ tokenHash: hashToken(raw), revokedAt: null }, { $set: { revokedAt: new Date() } });
}

async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

function cookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict',
    path: '/api/auth',
    ...(expiresAt ? { expires: expiresAt } : {})
  };
}

function setRefreshCookie(res, raw, expiresAt) {
  res.cookie(REFRESH_COOKIE, raw, cookieOptions(expiresAt));
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

module.exports = {
  REFRESH_COOKIE,
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  setRefreshCookie,
  clearRefreshCookie
};
