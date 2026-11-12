const { Router } = require('express');
const controller = require('../controllers/contact.controller');
const validate = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimiters');
const { contactSchema } = require('../validators/contact.validators');

const router = Router();

router.post('/', contactLimiter, validate(contactSchema), controller.submit);

module.exports = router;
