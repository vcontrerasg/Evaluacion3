const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const createApp = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const bcrypt = require('bcryptjs');

const app = createApp();

const valid = { name: 'Camila Rojas', email: 'camila@ejemplo.cl', password: 'ClaveSegura2026' };

async function createAdmin() {
  const passwordHash = await bcrypt.hash('AdminSegura2026', 4);
  return User.create({ name: 'Admin', email: 'admin@ejemplo.cl', passwordHash, role: 'admin' });
}

beforeAll(async () => {
  await connectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
});

describe('registro', () => {
  test('crea el usuario con rol user y no devuelve datos sensibles', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
    expect(res.body.accessToken).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('guarda la contraseña como hash bcrypt y no en texto plano', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const stored = await User.findOne({ email: valid.email }).select('+passwordHash');
    expect(stored.passwordHash).not.toBe(valid.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(await bcrypt.compare(valid.password, stored.passwordHash)).toBe(true);
  });

  test('ignora un intento de asignarse el rol admin', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, role: 'admin' });
    expect(res.status).toBe(400);
  });

  test('rechaza contraseñas débiles', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, password: 'corta1' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.password).toBeDefined();
  });

  test('rechaza correos duplicados', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(409);
  });
});

describe('inicio de sesión y JWT', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(valid);
  });

  test('entrega un JWT con sub, rol y expiración, sin datos sensibles', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(200);
    const payload = jwt.decode(res.body.accessToken);
    expect(payload.sub).toBeDefined();
    expect(payload.role).toBe('user');
    expect(payload.exp).toBeGreaterThan(payload.iat);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'iss', 'role', 'sub']);
  });

  test('rechaza credenciales incorrectas con un mensaje genérico', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'OtraClave2026' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nadie@ejemplo.cl', password: 'OtraClave2026' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.error.message).toBe(unknown.body.error.message);
  });

  test('bloquea la cuenta tras cinco intentos fallidos', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/login').send({ email: valid.email, password: 'Incorrecta2026' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(423);
  });

  test('rechaza operadores NoSQL en el cuerpo', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });
});

describe('rutas protegidas', () => {
  test('sin token responde 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('token_missing');
  });

  test('con token inválido responde 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('token_invalid');
  });

  test('con token expirado responde 401 token_expired', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    const expired = jwt.sign({ role: 'user' }, process.env.JWT_SECRET, {
      subject: reg.body.user.id,
      expiresIn: -10,
      issuer: 'andes-consultores'
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('token_expired');
  });

  test('rechaza tokens firmados con otra clave', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    const forged = jwt.sign({ role: 'admin' }, 'otra-clave-distinta-de-la-del-servidor-1234', {
      subject: reg.body.user.id,
      issuer: 'andes-consultores'
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('devuelve el perfil con un token válido', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(valid.email);
  });
});

describe('control de acceso por rol', () => {
  test('un usuario común recibe 403 en el panel administrativo', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(res.status).toBe(403);
  });

  test('sin token el panel administrativo responde 401', async () => {
    const res = await request(app).get('/api/admin/summary');
    expect(res.status).toBe(401);
  });

  test('el administrador accede al resumen', async () => {
    await createAdmin();
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@ejemplo.cl', password: 'AdminSegura2026' });
    const res = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users.total).toBe(1);
  });

  test('un token de usuario desactivado deja de ser válido', async () => {
    const reg = await request(app).post('/api/auth/register').send(valid);
    await User.updateOne({ email: valid.email }, { active: false });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(res.status).toBe(401);
  });
});

describe('renovación y cierre de sesión', () => {
  test('el refresh token rota y el anterior deja de servir', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(valid);
    const first = agent.jar.getCookies({ path: '/api/auth', domain: '127.0.0.1', secure: false, script: false });
    const oldCookie = first.map((c) => `${c.name}=${c.value}`).join('; ');

    const renewed = await agent.post('/api/auth/refresh');
    expect(renewed.status).toBe(200);
    expect(renewed.body.accessToken).toBeDefined();

    const replay = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);
    expect(replay.status).toBe(401);
  });

  test('refresh sin cookie responde 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  test('el cierre de sesión revoca el refresh token', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(valid);
    const cookies = agent.jar.getCookies({ path: '/api/auth', domain: '127.0.0.1', secure: false, script: false });
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);

    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('configuración de seguridad', () => {
  test('envía cabeceras de seguridad y oculta x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('las rutas inexistentes no exponen detalles internos', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|at /);
  });

  test('un JSON malformado responde 400 controlado', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|node_modules/);
  });
});
