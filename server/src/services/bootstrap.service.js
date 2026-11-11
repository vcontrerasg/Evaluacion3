const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const { passwordRule } = require('../validators/auth.validators');
const { BCRYPT_ROUNDS } = require('../controllers/auth.controller');

async function ensureAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;

  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const exists = await User.exists({ email });
  if (exists) return;

  const check = passwordRule.safeParse(env.ADMIN_PASSWORD);
  if (!check.success) {
    console.error('ADMIN_PASSWORD no cumple la política de contraseñas. No se creó el administrador');
    return;
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, BCRYPT_ROUNDS);
  await User.create({ name: env.ADMIN_NAME, email, passwordHash, role: 'admin' });
  console.log('Cuenta de administrador inicial creada');
}

module.exports = { ensureAdmin };
