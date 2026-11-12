const { Router } = require('express');
const controller = require('../controllers/reservation.controller');
const validate = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const { authenticate } = require('../middleware/auth');
const { reservationLimiter } = require('../middleware/rateLimiters');
const { createReservationSchema } = require('../validators/reservation.validators');

const router = Router();

router.use(authenticate);
router.post('/', reservationLimiter, validate(createReservationSchema), controller.create);
router.get('/mine', controller.mine);
router.patch('/:id/cancel', validateObjectId('id'), controller.cancel);

module.exports = router;
