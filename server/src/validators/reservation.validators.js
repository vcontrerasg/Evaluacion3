const { z } = require('zod');
const { pageQuery } = require('./common');
const { STATUSES } = require('../models/Reservation');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identificador inválido');

const createReservationSchema = z
  .object({
    serviceId: objectId,
    startsAt: z.iso.datetime({ message: 'Fecha y hora inválidas' }),
    notes: z.string().trim().max(300, 'Las notas no pueden superar 300 caracteres').optional()
  })
  .strict();

const adminReservationQuery = pageQuery.extend({
  status: z.enum(STATUSES).optional()
});

const adminReservationUpdateSchema = z.object({ status: z.enum(STATUSES) }).strict();

module.exports = { createReservationSchema, adminReservationQuery, adminReservationUpdateSchema, objectId };
