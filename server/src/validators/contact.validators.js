const { z } = require('zod');
const { pageQuery } = require('./common');
const { STATUSES } = require('../models/ContactMessage');

const singleLine = (min, max, label) =>
  z
    .string()
    .trim()
    .min(min, `${label} es demasiado corto`)
    .max(max, `${label} es demasiado largo`)
    .regex(/^[^\r\n]+$/, `${label} no puede tener saltos de línea`);

const contactSchema = z
  .object({
    name: singleLine(2, 80, 'El nombre'),
    email: z.string().trim().toLowerCase().max(120).email('Ingresa un correo válido'),
    phone: z
      .string()
      .trim()
      .regex(/^(\+?[0-9][0-9 ()-]{6,19})?$/, 'Ingresa un teléfono válido')
      .optional(),
    subject: singleLine(3, 100, 'El asunto'),
    message: z.string().trim().min(10, 'El mensaje debe tener al menos 10 caracteres').max(1000, 'El mensaje no puede superar 1000 caracteres'),
    website: z.string().max(200).optional(),
    elapsedMs: z.number().int().min(0).max(86400000)
  })
  .strict();

const adminContactQuery = pageQuery.extend({ status: z.enum(STATUSES).optional() });

const adminContactUpdateSchema = z.object({ status: z.enum(STATUSES) }).strict();

module.exports = { contactSchema, adminContactQuery, adminContactUpdateSchema };
