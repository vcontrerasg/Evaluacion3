const { z } = require('zod');

const base = {
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(80),
  description: z.string().trim().min(10, 'La descripción debe tener al menos 10 caracteres').max(500),
  durationMinutes: z.number().int().min(15, 'La duración mínima es de 15 minutos').max(240, 'La duración máxima es de 240 minutos'),
  price: z.number().int().min(0, 'El precio no puede ser negativo').max(10000000),
  active: z.boolean()
};

const createServiceSchema = z.object({ ...base, active: base.active.optional() }).strict();

const updateServiceSchema = z
  .object({
    name: base.name.optional(),
    description: base.description.optional(),
    durationMinutes: base.durationMinutes.optional(),
    price: base.price.optional(),
    active: base.active.optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un campo para actualizar' });

const availabilityQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
});

module.exports = { createServiceSchema, updateServiceSchema, availabilityQuery };
