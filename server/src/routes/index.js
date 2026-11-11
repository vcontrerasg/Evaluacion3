const { Router } = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');

const router = Router();

router.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded' });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
