const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const Service = require('../models/Service');
const SocialLink = require('../models/SocialLink');
const { passwordRule } = require('../validators/auth.validators');
const { BCRYPT_ROUNDS } = require('../controllers/auth.controller');

const DEMO_SERVICES = [
  { name: 'Diagnóstico inicial', description: 'Primera reunión para conocer tu situación, definir objetivos y proponer un plan de trabajo.', durationMinutes: 30, price: 0 },
  { name: 'Asesoría tributaria', description: 'Revisión de obligaciones tributarias, optimización de impuestos y orientación para tus declaraciones.', durationMinutes: 60, price: 45000 },
  { name: 'Planificación financiera', description: 'Análisis de ingresos, gastos y metas para construir un plan financiero a corto y mediano plazo.', durationMinutes: 60, price: 55000 },
  { name: 'Revisión de contratos', description: 'Lectura y observaciones sobre contratos comerciales o laborales antes de que los firmes.', durationMinutes: 45, price: 40000 }
];

const DEMO_LINKS = [
  { network: 'instagram', url: 'https://www.instagram.com/andesconsultores', order: 1 },
  { network: 'facebook', url: 'https://www.facebook.com/andesconsultores', order: 2 },
  { network: 'linkedin', url: 'https://www.linkedin.com/company/andesconsultores', order: 3 },
  { network: 'whatsapp', url: 'https://wa.me/56900000000', order: 4 }
];

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

async function seedDemoData() {
  if (env.SEED_DEMO_DATA !== 'true') return;

  if ((await Service.countDocuments({})) === 0) {
    await Service.insertMany(DEMO_SERVICES);
    console.log('Servicios de ejemplo creados');
  }
  if ((await SocialLink.countDocuments({})) === 0) {
    await SocialLink.insertMany(DEMO_LINKS);
    console.log('Enlaces de redes sociales de ejemplo creados');
  }
}

module.exports = { ensureAdmin, seedDemoData };
