const { Router } = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const serviceRoutes = require('./service.routes');
const reservationRoutes = require('./reservation.routes');
const socialRoutes = require('./social.routes');
const contactRoutes = require('./contact.routes');
const chatRoutes = require('./chat.routes');

const router = Router();

router.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded' });
});

router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/reservations', reservationRoutes);
router.use('/social-links', socialRoutes);
router.use('/contact', contactRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
