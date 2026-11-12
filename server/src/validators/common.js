const { z } = require('zod');

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

module.exports = { pageQuery };
