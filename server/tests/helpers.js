const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const { zonedToUtc, localParts } = require('../src/utils/time');

async function createUser(app, { name = 'Camila Rojas', email = 'camila@ejemplo.cl', password = 'ClaveSegura2026' } = {}) {
  const res = await request(app).post('/api/auth/register').send({ name, email, password });
  return { token: res.body.accessToken, user: res.body.user };
}

async function createAdmin(app, email = 'admin@ejemplo.cl') {
  const password = 'AdminSegura2026';
  const passwordHash = await bcrypt.hash(password, 4);
  const admin = await User.create({ name: 'Administrador', email, passwordHash, role: 'admin' });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { token: res.body.accessToken, user: admin };
}

function localDateParts(offsetDays) {
  return localParts(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));
}

function futureSlot({ weekday = 'business', hour = 10, minute = 0, from = 3 } = {}) {
  for (let d = from; d < from + 14; d += 1) {
    const p = localDateParts(d);
    const isBusinessDay = p.weekday >= 1 && p.weekday <= 5;
    const matches = weekday === 'business' ? isBusinessDay : p.weekday === weekday;
    if (matches) return zonedToUtc(p.year, p.month, p.day, hour, minute);
  }
  throw new Error('No se encontró un día adecuado');
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { createUser, createAdmin, futureSlot, auth };
