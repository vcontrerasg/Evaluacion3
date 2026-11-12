const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const Service = require('../models/Service');
const SocialLink = require('../models/SocialLink');
const ChatFaq = require('../models/ChatFaq');
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

const DEMO_FAQS = [
  { order: 1, question: '¿Cuál es el horario de atención?', keywords: ['horario', 'horarios', 'atención', 'atienden', 'abren', 'días de atención', 'a qué hora'], answer: 'Atendemos de lunes a viernes, de 09:00 a 18:00 (hora de Chile). Las reservas se hacen en bloques de 30 minutos.' },
  { order: 2, question: '¿Cómo reservo una hora?', keywords: ['reservar', 'reserva', 'reservo', 'agendar', 'agendo', 'agenda', 'cita', 'citas', 'pedir hora', 'tomar hora'], answer: 'Crea una cuenta o inicia sesión, entra a Reservar, elige el servicio, la fecha y un horario disponible, y confirma. Tu reserva queda pendiente hasta que la confirmemos.' },
  { order: 3, question: '¿Cómo cancelo una reserva?', keywords: ['cancelar', 'cancelo', 'cancelación', 'anular', 'anulo', 'anulación'], answer: 'En Mi cuenta, dentro de Mis reservas, usa el botón Cancelar de la reserva que quieras anular. Solo puedes cancelar reservas futuras.' },
  { order: 4, question: '¿Qué servicios ofrecen?', keywords: ['servicios', 'servicio', 'asesoría', 'asesorías', 'ofrecen', 'trabajan'], answer: 'Ofrecemos diagnóstico inicial, asesoría tributaria, planificación financiera y revisión de contratos. Puedes ver el detalle, la duración y el valor en la página de inicio.' },
  { order: 5, question: '¿Cuánto cuestan los servicios?', keywords: ['precio', 'precios', 'cuesta', 'cuánto cuesta', 'costo', 'valor', 'valores', 'tarifa'], answer: 'Cada servicio muestra su duración y su valor en la página de inicio. El diagnóstico inicial no tiene costo.' },
  { order: 6, question: '¿Cómo puedo contactarlos?', keywords: ['contacto', 'contactar', 'contactarlos', 'escribir', 'correo'], answer: 'Puedes escribirnos desde la página de Contacto y te responderemos por correo.' },
  { order: 7, question: '¿Mis datos están seguros?', keywords: ['datos', 'seguridad', 'seguro', 'segura', 'seguros', 'privacidad', 'contraseña'], answer: 'Las contraseñas se guardan protegidas con bcrypt, las sesiones caducan automáticamente y cada persona solo accede a su propia información.' }
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
  if ((await ChatFaq.countDocuments({})) === 0) {
    await ChatFaq.insertMany(DEMO_FAQS);
    console.log('Preguntas del chatbot de ejemplo creadas');
  }
}

module.exports = { ensureAdmin, seedDemoData };
