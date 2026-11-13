const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const ContactMessage = require('../src/models/ContactMessage');
const mail = require('../src/services/mail.service');
const { createUser, createAdmin, auth } = require('./helpers');

const app = createApp();

const valid = {
  name: 'Camila Rojas',
  email: 'camila@ejemplo.cl',
  phone: '+56 9 1234 5678',
  subject: 'Consulta por asesoría tributaria',
  message: 'Hola, quisiera conocer los valores y la disponibilidad para esta semana.',
  elapsedMs: 8000
};

beforeAll(async () => {
  await connectDB();
  await Promise.all([User.init(), ContactMessage.init(), RefreshToken.init()]);
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({}), ContactMessage.deleteMany({})]);
  mail.resetOutbox();
  mail.setSender(null);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
});

describe('envío del formulario', () => {
  test('guarda el mensaje y envía la notificación y la confirmación', async () => {
    const res = await request(app).post('/api/contact').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.confirmationSent).toBe(true);

    const stored = await ContactMessage.findOne({ email: valid.email });
    expect(stored.status).toBe('new');
    expect(stored.subject).toBe(valid.subject);
    expect(stored.mail.notification).toBe('sent');
    expect(stored.mail.confirmation).toBe('sent');
    expect(stored.ipHash).toHaveLength(16);

    expect(mail.outbox).toHaveLength(2);
    const toOrg = mail.outbox.find((m) => m.to === process.env.CONTACT_TO);
    const toClient = mail.outbox.find((m) => m.to === valid.email);
    expect(toOrg.replyTo).toBe(valid.email);
    expect(toOrg.text).toContain(valid.message);
    expect(toClient.subject).toBe('Recibimos tu mensaje');
    expect(toClient.text).not.toContain(valid.message);
  });

  test('el teléfono es opcional', async () => {
    const { phone, ...withoutPhone } = valid;
    const res = await request(app).post('/api/contact').send(withoutPhone);
    expect(res.status).toBe(201);
  });

  test('escapa el HTML del contenido en los correos', async () => {
    const attack = { ...valid, name: 'Ana <b>X</b>', subject: 'Prueba <script>alert(1)</script>', message: 'Mensaje con <img src=x onerror=alert(1)> contenido' };
    const res = await request(app).post('/api/contact').send(attack);
    expect(res.status).toBe(201);
    for (const m of mail.outbox) {
      expect(m.html.toLowerCase()).not.toContain('<script');
    }
    expect(mail.outbox[0].html).toMatch(/&lt;script&gt;|&lt;img/);
  });

  test('guarda el mensaje aunque el envío de correo falle', async () => {
    mail.setSender(async () => {
      throw new Error('proveedor caído');
    });
    const res = await request(app).post('/api/contact').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.confirmationSent).toBe(false);
    const stored = await ContactMessage.findOne({ email: valid.email });
    expect(stored.mail.notification).toBe('failed');
    expect(stored.mail.confirmation).toBe('failed');
  });
});

describe('protección antispam', () => {
  test('el campo trampa lleno responde éxito sin guardar ni enviar nada', async () => {
    const res = await request(app).post('/api/contact').send({ ...valid, website: 'http://spam.example.com' });
    expect(res.status).toBe(201);
    expect(await ContactMessage.countDocuments({})).toBe(0);
    expect(mail.outbox).toHaveLength(0);
  });

  test('rechaza envíos demasiado rápidos', async () => {
    const res = await request(app).post('/api/contact').send({ ...valid, elapsedMs: 300 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('too_fast');
    expect(await ContactMessage.countDocuments({})).toBe(0);
  });

  test('limita a tres mensajes por correo cada 24 horas', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await request(app).post('/api/contact').send(valid)).status).toBe(201);
    }
    const res = await request(app).post('/api/contact').send(valid);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('contact_limit');
    expect(await ContactMessage.countDocuments({})).toBe(3);

    const other = await request(app).post('/api/contact').send({ ...valid, email: 'otra@ejemplo.cl' });
    expect(other.status).toBe(201);
  });
});

describe('validación', () => {
  const cases = [
    ['correo inválido', { email: 'no-es-correo' }],
    ['nombre con salto de línea', { name: 'Ana\r\nBcc: victima@ejemplo.cl' }],
    ['asunto con salto de línea', { subject: 'Hola\nBcc: victima@ejemplo.cl' }],
    ['mensaje demasiado corto', { message: 'corto' }],
    ['mensaje demasiado largo', { message: 'a'.repeat(1001) }],
    ['teléfono inválido', { phone: 'llamar ahora' }],
    ['campo no declarado', { role: 'admin' }],
    ['tipo inesperado', { name: { $ne: null } }]
  ];

  test.each(cases)('rechaza %s', async (label, patch) => {
    const res = await request(app).post('/api/contact').send({ ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(await ContactMessage.countDocuments({})).toBe(0);
    expect(mail.outbox).toHaveLength(0);
  });

  test('rechaza solicitudes sin el tiempo de llenado', async () => {
    const { elapsedMs, ...incomplete } = valid;
    const res = await request(app).post('/api/contact').send(incomplete);
    expect(res.status).toBe(400);
  });

  test('rechaza cuerpos que superan el límite de tamaño', async () => {
    const res = await request(app).post('/api/contact').send({ ...valid, message: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });
});

describe('gestión de mensajes (administrador)', () => {
  let admin;

  beforeEach(async () => {
    admin = await createAdmin(app);
    await request(app).post('/api/contact').send(valid);
    await request(app).post('/api/contact').send({ ...valid, email: 'otra@ejemplo.cl', subject: 'Otro asunto' });
  });

  test('sin token responde 401 y con usuario común 403', async () => {
    const user = await createUser(app);
    expect((await request(app).get('/api/admin/contact-messages')).status).toBe(401);
    expect((await request(app).get('/api/admin/contact-messages').set(auth(user.token))).status).toBe(403);
    const one = await ContactMessage.findOne({});
    expect((await request(app).patch(`/api/admin/contact-messages/${one.id}`).set(auth(user.token)).send({ status: 'read' })).status).toBe(403);
    expect((await request(app).delete(`/api/admin/contact-messages/${one.id}`).set(auth(user.token))).status).toBe(403);
  });

  test('lista, filtra, cambia el estado y elimina mensajes', async () => {
    const list = await request(app).get('/api/admin/contact-messages').set(auth(admin.token));
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(2);
    expect(JSON.stringify(list.body)).not.toMatch(/ipHash/);

    const id = list.body.messages[0].id;
    const updated = await request(app).patch(`/api/admin/contact-messages/${id}`).set(auth(admin.token)).send({ status: 'read' });
    expect(updated.body.message.status).toBe('read');

    const onlyNew = await request(app).get('/api/admin/contact-messages').query({ status: 'new' }).set(auth(admin.token));
    expect(onlyNew.body.total).toBe(1);

    const bad = await request(app).patch(`/api/admin/contact-messages/${id}`).set(auth(admin.token)).send({ status: 'borrado' });
    expect(bad.status).toBe(400);

    const removed = await request(app).delete(`/api/admin/contact-messages/${id}`).set(auth(admin.token));
    expect(removed.status).toBe(204);
    expect(await ContactMessage.countDocuments({})).toBe(1);
  });

  test('el resumen incluye los mensajes nuevos', async () => {
    const res = await request(app).get('/api/admin/summary').set(auth(admin.token));
    expect(res.body.contactMessages.new).toBe(2);
  });
});
