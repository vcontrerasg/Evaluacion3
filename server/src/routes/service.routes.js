const { Router } = require('express');
const controller = require('../controllers/service.controller');
const validate = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const { availabilityQuery } = require('../validators/service.validators');

const router = Router();

router.get('/', controller.listPublic);
router.get('/:id/availability', validateObjectId('id'), validate(availabilityQuery, 'query'), controller.availability);

module.exports = router;
