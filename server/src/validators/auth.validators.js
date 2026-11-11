const { z } = require('zod');

const email = z.string().trim().toLowerCase().max(120).email('Ingresa un correo válido');

const password = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número');

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa tu nombre').max(80),
    email,
    password
  })
  .strict();

const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Ingresa tu contraseña').max(72)
  })
  .strict();

module.exports = { registerSchema, loginSchema, passwordRule: password };
