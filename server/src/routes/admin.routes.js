const { Router } = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/summary', controller.summary);

module.exports = router;
