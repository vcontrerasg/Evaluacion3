const { z } = require('zod');
const { NETWORKS } = require('../models/SocialLink');

const ALLOWED_HOSTS = {
  instagram: ['instagram.com', 'www.instagram.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
  whatsapp: ['wa.me', 'api.whatsapp.com', 'whatsapp.com', 'www.whatsapp.com']
};

function normalizeUrl(raw, network) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (!ALLOWED_HOSTS[network].includes(parsed.hostname.toLowerCase())) return null;
  return parsed.toString();
}

const fields = {
  network: z.enum(NETWORKS),
  url: z.string().trim().min(10).max(200),
  label: z.string().trim().max(40),
  active: z.boolean(),
  order: z.number().int().min(0).max(99)
};

function withUrlCheck(schema) {
  return schema.superRefine((value, ctx) => {
    if (value.url === undefined) return;
    const network = value.network;
    if (!network) return;
    const normalized = normalizeUrl(value.url, network);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: `Ingresa un enlace https válido de ${network}` });
    }
  });
}

const createSocialSchema = withUrlCheck(
  z
    .object({ network: fields.network, url: fields.url, label: fields.label.optional(), active: fields.active.optional(), order: fields.order.optional() })
    .strict()
);

const updateSocialSchema = z
  .object({ url: fields.url.optional(), label: fields.label.optional(), active: fields.active.optional(), order: fields.order.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un campo para actualizar' });

module.exports = { createSocialSchema, updateSocialSchema, normalizeUrl };
