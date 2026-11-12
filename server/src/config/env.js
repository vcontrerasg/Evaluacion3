const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(10),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  CLIENT_ORIGIN: z.string().optional().default(''),
  ADMIN_NAME: z.string().optional().default('Administrador'),
  ADMIN_EMAIL: z.string().optional().default(''),
  ADMIN_PASSWORD: z.string().optional().default(''),
  SEED_DEMO_DATA: z.enum(['true', 'false']).default('false')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  console.error(`Configuración inválida. Revisa las variables de entorno: ${fields}`);
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  allowedOrigins: env.CLIENT_ORIGIN ? env.CLIENT_ORIGIN.split(',').map((s) => s.trim()) : []
};
