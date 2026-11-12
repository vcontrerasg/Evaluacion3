const crypto = require('crypto');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const ContactMessage = require('../models/ContactMessage');
const { sendMail, notificationEmail, confirmationEmail } = require('../services/mail.service');

const MIN_FILL_MS = 2000;
const MAX_PER_EMAIL_PER_DAY = 3;

function mailState(result) {
  return result.status === 'fulfilled' ? result.value : 'failed';
}

async function submit(req, res, next) {
  try {
    const { website, elapsedMs, ...data } = req.body;

    if (website) return res.status(201).json({ ok: true });

    if (elapsedMs < MIN_FILL_MS) {
      throw new AppError(400, 'Espera unos segundos antes de enviar el formulario', 'too_fast');
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await ContactMessage.countDocuments({ email: data.email, createdAt: mongoose.trusted({ $gt: since }) });
    if (recent >= MAX_PER_EMAIL_PER_DAY) {
      throw new AppError(429, 'Ya recibimos varios mensajes desde este correo. Intenta nuevamente mañana', 'contact_limit');
    }

    const ipHash = crypto.createHash('sha256').update(`${req.ip}|${env.JWT_SECRET}`).digest('hex').slice(0, 16);
    const contact = await ContactMessage.create({ ...data, phone: data.phone || '', ipHash });

    const results = await Promise.allSettled([sendMail(notificationEmail(contact)), sendMail(confirmationEmail(contact))]);
    contact.mail = { notification: mailState(results[0]), confirmation: mailState(results[1]) };
    await contact.save();

    if (!env.isTest && results.some((r) => r.status === 'rejected')) {
      console.error('[contacto] no se pudo enviar uno de los correos');
    }

    res.status(201).json({ ok: true, confirmationSent: contact.mail.confirmation === 'sent' });
  } catch (err) {
    next(err);
  }
}

async function adminList(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      ContactMessage.countDocuments(filter)
    ]);
    res.json({ messages: items.map((m) => m.toPublic()), page, limit, total });
  } catch (err) {
    next(err);
  }
}

async function adminUpdate(req, res, next) {
  try {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) throw new AppError(404, 'Mensaje no encontrado', 'message_not_found');
    message.status = req.body.status;
    await message.save();
    res.json({ message: message.toPublic() });
  } catch (err) {
    next(err);
  }
}

async function adminRemove(req, res, next) {
  try {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) throw new AppError(404, 'Mensaje no encontrado', 'message_not_found');
    await message.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { submit, adminList, adminUpdate, adminRemove };
