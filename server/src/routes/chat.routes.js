const { Router } = require('express');
const controller = require('../controllers/chat.controller');
const validate = require('../middleware/validate');
const { chatLimiter } = require('../middleware/rateLimiters');
const { chatSchema } = require('../validators/chat.validators');

const router = Router();

router.get('/suggestions', controller.suggestions);
router.post('/', chatLimiter, validate(chatSchema), controller.ask);

module.exports = router;
