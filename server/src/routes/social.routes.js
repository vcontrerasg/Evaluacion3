const { Router } = require('express');
const controller = require('../controllers/social.controller');

const router = Router();

router.get('/', controller.listPublic);

module.exports = router;
