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
  SEED_DEMO_DATA: z.enum(['true', 'false']).default('false'),
  MAIL_PROVIDER: z.enum(['none', 'brevo', 'resend']).default('none'),
  MAIL_API_KEY: z.string().optional().default(''),
  MAIL_FROM_EMAIL: z.string().optional().default(''),
  MAIL_FROM_NAME: z.string().optional().default('Andes Consultores'),
  CONTACT_TO: z.string().optional().default(''),
  CHAT_AI_PROVIDER: z.enum(['none', 'groq']).default('none'),
  CHAT_AI_API_KEY: z.string().optional().default(''),
  CHAT_AI_MODEL: z.string().optional().default('llama-3.1-8b-instant'),
  CHAT_AI_DAILY_LIMIT: z.coerce.number().int().min(0).max(100000).default(200)
}).superRefine((v, ctx) => {
  if (v.CHAT_AI_PROVIDER !== 'none' && !v.CHAT_AI_API_KEY) {
    ctx.addIssue({ code: 'custom', path: ['CHAT_AI_API_KEY'], message: 'requerida' });
  }
  if (v.MAIL_PROVIDER !== 'none') {
    if (!v.MAIL_API_KEY) ctx.addIssue({ code: 'custom', path: ['MAIL_API_KEY'], message: 'requerida' });
    if (!v.MAIL_FROM_EMAIL) ctx.addIssue({ code: 'custom', path: ['MAIL_FROM_EMAIL'], message: 'requerida' });
    if (!v.CONTACT_TO && !v.ADMIN_EMAIL) ctx.addIssue({ code: 'custom', path: ['CONTACT_TO'], message: 'requerida' });
  }
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
  contactTo: env.CONTACT_TO || env.ADMIN_EMAIL,
  allowedOrigins: env.CLIENT_ORIGIN ? env.CLIENT_ORIGIN.split(',').map((s) => s.trim()) : []
};
