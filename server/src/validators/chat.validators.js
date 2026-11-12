const { z } = require('zod');
const { pageQuery } = require('./common');
const { SOURCES } = require('../models/ChatLog');

const chatSchema = z
  .object({
    message: z.string().trim().min(1, 'Escribe tu pregunta').max(300, 'La pregunta no puede superar 300 caracteres'),
    sessionId: z.uuid().optional()
  })
  .strict();

const keyword = z.string().trim().min(2, 'Cada palabra clave debe tener al menos 2 caracteres').max(30, 'Cada palabra clave puede tener hasta 30 caracteres');

const faqFields = {
  question: z.string().trim().min(3, 'La pregunta debe tener al menos 3 caracteres').max(150),
  keywords: z.array(keyword).max(15, 'Máximo 15 palabras clave'),
  answer: z.string().trim().min(5, 'La respuesta debe tener al menos 5 caracteres').max(800, 'La respuesta puede tener hasta 800 caracteres'),
  active: z.boolean(),
  order: z.number().int().min(0).max(999)
};

const createFaqSchema = z
  .object({ question: faqFields.question, keywords: faqFields.keywords.optional(), answer: faqFields.answer, active: faqFields.active.optional(), order: faqFields.order.optional() })
  .strict();

const updateFaqSchema = z
  .object({
    question: faqFields.question.optional(),
    keywords: faqFields.keywords.optional(),
    answer: faqFields.answer.optional(),
    active: faqFields.active.optional(),
    order: faqFields.order.optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un campo para actualizar' });

const adminChatLogQuery = pageQuery.extend({ source: z.enum(SOURCES).optional() });

module.exports = { chatSchema, createFaqSchema, updateFaqSchema, adminChatLogQuery };
