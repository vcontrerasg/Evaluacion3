const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
const Reservation = require('../models/Reservation');
const SocialLink = require('../models/SocialLink');
const ContactMessage = require('../models/ContactMessage');

async function summary(req, res, next) {
  try {
    const now = new Date();
    const [total, admins, active, services, activeServices, pending, confirmed, cancelled, upcoming, links, newMessages] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ active: true }),
      Service.countDocuments({}),
      Service.countDocuments({ active: true }),
      Reservation.countDocuments({ status: 'pending' }),
      Reservation.countDocuments({ status: 'confirmed' }),
      Reservation.countDocuments({ status: 'cancelled' }),
      Reservation.countDocuments({ blocksSlot: true, startsAt: mongoose.trusted({ $gt: now }) }),
      SocialLink.countDocuments({ active: true }),
      ContactMessage.countDocuments({ status: 'new' })
    ]);
    res.json({
      users: { total, admins, active },
      services: { total: services, active: activeServices },
      reservations: { pending, confirmed, cancelled, upcoming },
      socialLinks: { active: links },
      contactMessages: { new: newMessages }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary };
