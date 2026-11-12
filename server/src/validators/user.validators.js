const { z } = require('zod');
const { pageQuery } = require('./common');
const { registerSchema } = require('./auth.validators');
const { ROLES } = require('../models/User');

const adminUserQuery = pageQuery.extend({
  search: z.string().trim().max(50).optional(),
  role: z.enum(ROLES).optional()
});

const adminCreateUserSchema = registerSchema.extend({ role: z.enum(ROLES) }).strict();

const adminUpdateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    active: z.boolean().optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un campo para actualizar' });

module.exports = { adminUserQuery, adminCreateUserSchema, adminUpdateUserSchema };
