const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const Service = require('../src/models/Service');
const Reservation = require('../src/models/Reservation');
const SocialLink = require('../src/models/SocialLink');
const { createUser, createAdmin, futureSlot, auth } = require('./helpers');

const app = createApp();

const serviceData = {
  name: 'Asesoría tributaria',
  description: 'Revisión de obligaciones tributarias y orientación.',
  durationMinutes: 60,
  price: 45000
};

let admin;
let userA;
let userB;
let service;

beforeAll(async () => {
  await connectDB();
  await Promise.all([User.init(), Service.init(), Reservation.init(), SocialLink.init(), RefreshToken.init()]);
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    RefreshToken.deleteMany({}),
    Service.deleteMany({}),
    Reservation.deleteMany({}),
    SocialLink.deleteMany({})
  ]);
  admin = await createAdmin(app);
  userA = await createUser(app, { name: 'Camila Rojas', email: 'a@ejemplo.cl' });
  userB = await createUser(app, { name: 'Diego Soto', email: 'b@ejemplo.cl' });
  service = await Service.create(serviceData);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
});

describe('servicios públicos', () => {
  test('el listado público muestra solo servicios activos', async () => {
    await Service.create({ ...serviceData, name: 'Servicio inactivo', active: false });
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.services).toHaveLength(1);
    expect(res.body.services[0].name).toBe(serviceData.name);
  });

  test('la disponibilidad marca ocupados los horarios reservados', async () => {
    const slot = futureSlot({ hour: 10, minute: 30 });
    await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: slot.toISOString() });
    const date = slot.toISOString().slice(0, 10);
    const res = await request(app).get(`/api/services/${service.id}/availability`).query({ date });
    expect(res.status).toBe(200);
    const same = res.body.slots.find((s) => s.startsAt === slot.toISOString());
    expect(same.available).toBe(false);
  });

  test('rechaza una fecha de disponibilidad inválida y un identificador inválido', async () => {
    const bad = await request(app).get(`/api/services/${service.id}/availability`).query({ date: '2026-13-45' });
    expect(bad.status).toBe(400);
    const badId = await request(app).get('/api/services/no-es-un-id/availability').query({ date: '2026-12-01' });
    expect(badId.status).toBe(400);
  });
});

describe('CRUD de servicios (administrador)', () => {
  test('sin token responde 401 y con usuario común 403', async () => {
    expect((await request(app).post('/api/admin/services').send(serviceData)).status).toBe(401);
    expect((await request(app).post('/api/admin/services').set(auth(userA.token)).send(serviceData)).status).toBe(403);
  });

  test('crea, actualiza y elimina un servicio', async () => {
    const created = await request(app)
      .post('/api/admin/services')
      .set(auth(admin.token))
      .send({ ...serviceData, name: 'Planificación financiera' });
    expect(created.status).toBe(201);

    const id = created.body.service.id;
    const updated = await request(app).patch(`/api/admin/services/${id}`).set(auth(admin.token)).send({ price: 50000, active: false });
    expect(updated.status).toBe(200);
    expect(updated.body.service.price).toBe(50000);
    expect(updated.body.service.active).toBe(false);

    const removed = await request(app).delete(`/api/admin/services/${id}`).set(auth(admin.token));
    expect(removed.status).toBe(204);
    expect(await Service.findById(id)).toBeNull();
  });

  test('valida precio negativo, duración fuera de rango y campos no declarados', async () => {
    const negative = await request(app).post('/api/admin/services').set(auth(admin.token)).send({ ...serviceData, name: 'Otro servicio', price: -10 });
    expect(negative.status).toBe(400);
    expect(negative.body.error.fields.price).toBeDefined();

    const duration = await request(app).post('/api/admin/services').set(auth(admin.token)).send({ ...serviceData, name: 'Otro servicio', durationMinutes: 5 });
    expect(duration.status).toBe(400);

    const extra = await request(app).post('/api/admin/services').set(auth(admin.token)).send({ ...serviceData, name: 'Otro servicio', _id: 'x' });
    expect(extra.status).toBe(400);
  });

  test('rechaza nombres duplicados', async () => {
    const res = await request(app).post('/api/admin/services').set(auth(admin.token)).send(serviceData);
    expect(res.status).toBe(409);
  });

  test('no elimina un servicio con reservas asociadas', async () => {
    const slot = futureSlot();
    await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: slot.toISOString() });
    const res = await request(app).delete(`/api/admin/services/${service.id}`).set(auth(admin.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('service_in_use');
  });
});

describe('reservas', () => {
  test('requiere autenticación', async () => {
    const res = await request(app).post('/api/reservations').send({ serviceId: service.id, startsAt: futureSlot().toISOString() });
    expect(res.status).toBe(401);
  });

  test('crea una reserva pendiente asociada al usuario autenticado', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set(auth(userA.token))
      .send({ serviceId: service.id, startsAt: futureSlot().toISOString(), notes: 'Primera consulta' });
    expect(res.status).toBe(201);
    expect(res.body.reservation.status).toBe('pending');
    const stored = await Reservation.findById(res.body.reservation.id);
    expect(stored.user.toString()).toBe(userA.user.id);
  });

  test('impide que dos solicitudes reserven el mismo horario', async () => {
    const body = { serviceId: service.id, startsAt: futureSlot({ hour: 11 }).toISOString() };
    const [r1, r2] = await Promise.all([
      request(app).post('/api/reservations').set(auth(userA.token)).send(body),
      request(app).post('/api/reservations').set(auth(userB.token)).send(body)
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect(await Reservation.countDocuments({ service: service._id })).toBe(1);
  });

  test('libera el horario al cancelar y permite reservarlo de nuevo', async () => {
    const body = { serviceId: service.id, startsAt: futureSlot({ hour: 12 }).toISOString() };
    const first = await request(app).post('/api/reservations').set(auth(userA.token)).send(body);
    await request(app).patch(`/api/reservations/${first.body.reservation.id}/cancel`).set(auth(userA.token));
    const again = await request(app).post('/api/reservations').set(auth(userB.token)).send(body);
    expect(again.status).toBe(201);
  });

  test('rechaza fechas pasadas, fines de semana, horas fuera de horario y minutos irregulares', async () => {
    const past = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: '2020-01-06T13:00:00.000Z' });
    expect(past.status).toBe(400);

    const weekend = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot({ weekday: 6 }).toISOString() });
    expect(weekend.status).toBe(400);
    expect(weekend.body.error.code).toBe('invalid_slot');

    const night = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot({ hour: 22 }).toISOString() });
    expect(night.status).toBe(400);

    const odd = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot({ hour: 10, minute: 17 }).toISOString() });
    expect(odd.status).toBe(400);
  });

  test('rechaza reservas con más de 90 días de anticipación', async () => {
    const res = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot({ from: 120 }).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_window');
  });

  test('rechaza servicios inexistentes, inactivos y datos mal formados', async () => {
    await Service.updateOne({ _id: service._id }, { active: false });
    const inactive = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot().toISOString() });
    expect(inactive.status).toBe(404);

    const malformed = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: { $ne: null }, startsAt: 'mañana' });
    expect(malformed.status).toBe(400);
  });

  test('aplica el máximo de reservas activas por usuario', async () => {
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot({ hour: 9 + i }).toISOString() });
      expect(res.status).toBe(201);
    }
    const sixth = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot({ hour: 16 }).toISOString() });
    expect(sixth.status).toBe(409);
    expect(sixth.body.error.code).toBe('reservation_limit');
  });

  test('cada usuario solo ve sus propias reservas', async () => {
    await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot({ hour: 9 }).toISOString() });
    await request(app).post('/api/reservations').set(auth(userB.token)).send({ serviceId: service.id, startsAt: futureSlot({ hour: 10 }).toISOString() });
    const res = await request(app).get('/api/reservations/mine').set(auth(userA.token));
    expect(res.body.reservations).toHaveLength(1);
    expect(res.body.reservations[0].user).toBeUndefined();
  });

  test('un usuario no puede cancelar la reserva de otro', async () => {
    const created = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot().toISOString() });
    const res = await request(app).patch(`/api/reservations/${created.body.reservation.id}/cancel`).set(auth(userB.token));
    expect(res.status).toBe(403);
    expect((await Reservation.findById(created.body.reservation.id)).status).toBe('pending');
  });

  test('el propietario cancela su reserva y el administrador gestiona estados', async () => {
    const created = await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot().toISOString() });
    const id = created.body.reservation.id;

    const confirmed = await request(app).patch(`/api/admin/reservations/${id}`).set(auth(admin.token)).send({ status: 'confirmed' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.reservation.status).toBe('confirmed');

    const list = await request(app).get('/api/admin/reservations').query({ status: 'confirmed' }).set(auth(admin.token));
    expect(list.body.total).toBe(1);
    expect(list.body.reservations[0].user.email).toBe('a@ejemplo.cl');

    const cancelled = await request(app).patch(`/api/reservations/${id}/cancel`).set(auth(userA.token));
    expect(cancelled.body.reservation.status).toBe('cancelled');

    const forbidden = await request(app).get('/api/admin/reservations').set(auth(userA.token));
    expect(forbidden.status).toBe(403);

    const removed = await request(app).delete(`/api/admin/reservations/${id}`).set(auth(admin.token));
    expect(removed.status).toBe(204);
  });
});

describe('gestión de usuarios (administrador)', () => {
  test('lista, filtra y busca usuarios', async () => {
    const all = await request(app).get('/api/admin/users').set(auth(admin.token));
    expect(all.body.total).toBe(3);
    expect(JSON.stringify(all.body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    const search = await request(app).get('/api/admin/users').query({ search: 'diego' }).set(auth(admin.token));
    expect(search.body.users).toHaveLength(1);
    expect(search.body.users[0].email).toBe('b@ejemplo.cl');

    const regex = await request(app).get('/api/admin/users').query({ search: '.*' }).set(auth(admin.token));
    expect(regex.body.users).toHaveLength(0);
  });

  test('un usuario común no accede a la gestión de usuarios', async () => {
    expect((await request(app).get('/api/admin/users').set(auth(userA.token))).status).toBe(403);
    expect((await request(app).patch(`/api/admin/users/${userB.user.id}`).set(auth(userA.token)).send({ role: 'admin' })).status).toBe(403);
  });

  test('cambia el rol y el cambio se aplica de inmediato', async () => {
    const res = await request(app).patch(`/api/admin/users/${userA.user.id}`).set(auth(admin.token)).send({ role: 'admin' });
    expect(res.status).toBe(200);
    const summary = await request(app).get('/api/admin/summary').set(auth(userA.token));
    expect(summary.status).toBe(200);
  });

  test('desactivar una cuenta bloquea su acceso y revoca sus sesiones', async () => {
    await request(app).patch(`/api/admin/users/${userA.user.id}`).set(auth(admin.token)).send({ active: false });
    expect((await request(app).get('/api/auth/me').set(auth(userA.token))).status).toBe(401);
    expect(await RefreshToken.countDocuments({ user: userA.user.id, revokedAt: null })).toBe(0);
  });

  test('el administrador no puede modificar su propia cuenta', async () => {
    const res = await request(app).patch(`/api/admin/users/${admin.user.id}`).set(auth(admin.token)).send({ role: 'user' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('self_modification');
  });

  test('un administrador puede degradar a otro y siempre queda uno activo', async () => {
    const other = await createAdmin(app, 'otro@ejemplo.cl');
    const res = await request(app).patch(`/api/admin/users/${other.user.id}`).set(auth(admin.token)).send({ role: 'user' });
    expect(res.status).toBe(200);
    expect(await User.countDocuments({ role: 'admin', active: true })).toBe(1);
    const denied = await request(app).get('/api/admin/summary').set(auth(other.token));
    expect(denied.status).toBe(403);
  });

  test('crea usuarios con rol definido y almacena el hash', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(auth(admin.token))
      .send({ name: 'Nuevo Admin', email: 'nuevo@ejemplo.cl', password: 'ClaveSegura2026', role: 'admin' });
    expect(res.status).toBe(201);
    const stored = await User.findOne({ email: 'nuevo@ejemplo.cl' }).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  test('rechaza roles inválidos y campos no declarados', async () => {
    expect((await request(app).patch(`/api/admin/users/${userA.user.id}`).set(auth(admin.token)).send({ role: 'superadmin' })).status).toBe(400);
    expect((await request(app).patch(`/api/admin/users/${userA.user.id}`).set(auth(admin.token)).send({ passwordHash: 'x' })).status).toBe(400);
  });
});

describe('redes sociales', () => {
  const valid = { network: 'instagram', url: 'https://www.instagram.com/andesconsultores', order: 1 };

  test('el administrador crea, edita y elimina enlaces; el público ve los activos', async () => {
    const created = await request(app).post('/api/admin/social-links').set(auth(admin.token)).send(valid);
    expect(created.status).toBe(201);
    const id = created.body.link.id;

    expect((await request(app).get('/api/social-links')).body.links).toHaveLength(1);

    await request(app).patch(`/api/admin/social-links/${id}`).set(auth(admin.token)).send({ active: false });
    expect((await request(app).get('/api/social-links')).body.links).toHaveLength(0);

    const edited = await request(app).patch(`/api/admin/social-links/${id}`).set(auth(admin.token)).send({ url: 'https://www.instagram.com/nuevo' });
    expect(edited.body.link.url).toBe('https://www.instagram.com/nuevo');

    expect((await request(app).delete(`/api/admin/social-links/${id}`).set(auth(admin.token))).status).toBe(204);
  });

  test('rechaza enlaces inseguros o de otro dominio', async () => {
    const attempts = [
      'http://www.instagram.com/andes',
      'javascript:alert(1)',
      'https://evil.example.com/instagram.com',
      'https://instagram.com.evil.example/andes',
      'https://usuario:clave@www.instagram.com/andes',
      'no-es-una-url'
    ];
    for (const url of attempts) {
      const res = await request(app).post('/api/admin/social-links').set(auth(admin.token)).send({ ...valid, url });
      expect(res.status).toBe(400);
    }
    const edit = await request(app).post('/api/admin/social-links').set(auth(admin.token)).send(valid);
    const bad = await request(app).patch(`/api/admin/social-links/${edit.body.link.id}`).set(auth(admin.token)).send({ url: 'https://evil.example.com/x' });
    expect(bad.status).toBe(400);
  });

  test('una red social no puede repetirse y solo el administrador gestiona', async () => {
    await request(app).post('/api/admin/social-links').set(auth(admin.token)).send(valid);
    expect((await request(app).post('/api/admin/social-links').set(auth(admin.token)).send(valid)).status).toBe(409);
    expect((await request(app).post('/api/admin/social-links').set(auth(userA.token)).send({ ...valid, network: 'facebook', url: 'https://www.facebook.com/x' })).status).toBe(403);
  });
});

describe('resumen administrativo', () => {
  test('incluye métricas de servicios, reservas y redes', async () => {
    await request(app).post('/api/reservations').set(auth(userA.token)).send({ serviceId: service.id, startsAt: futureSlot().toISOString() });
    const res = await request(app).get('/api/admin/summary').set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.services.active).toBe(1);
    expect(res.body.reservations.pending).toBe(1);
    expect(res.body.reservations.upcoming).toBe(1);
  });
});
