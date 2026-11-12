const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const Service = require('../models/Service');
const Reservation = require('../models/Reservation');
const { isBusinessSlot, withinBookingWindow } = require('../utils/time');

const MAX_ACTIVE_PER_USER = 5;

async function create(req, res, next) {
  try {
    const { serviceId, startsAt, notes } = req.body;

    const service = await Service.findOne({ _id: serviceId, active: true });
    if (!service) throw new AppError(404, 'El servicio no existe o no está disponible', 'service_not_found');

    const date = new Date(startsAt);
    if (!isBusinessSlot(date)) {
      throw new AppError(400, 'El horario debe ser de lunes a viernes, entre 09:00 y 18:00, en bloques de 30 minutos', 'invalid_slot');
    }
    if (!withinBookingWindow(date)) {
      throw new AppError(400, 'Solo puedes reservar horas futuras con hasta 90 días de anticipación', 'invalid_window');
    }

    const active = await Reservation.countDocuments({
      user: req.user._id,
      blocksSlot: true,
      startsAt: mongoose.trusted({ $gt: new Date() })
    });
    if (active >= MAX_ACTIVE_PER_USER) {
      throw new AppError(409, `Alcanzaste el máximo de ${MAX_ACTIVE_PER_USER} reservas activas`, 'reservation_limit');
    }

    let reservation;
    try {
      reservation = await Reservation.create({ user: req.user._id, service: service._id, startsAt: date, notes: notes || '' });
    } catch (err) {
      if (err.code === 11000) throw new AppError(409, 'Ese horario ya fue reservado. Elige otro', 'slot_taken');
      throw err;
    }

    await reservation.populate('service');
    res.status(201).json({ reservation: reservation.toPublic() });
  } catch (err) {
    next(err);
  }
}

async function mine(req, res, next) {
  try {
    const reservations = await Reservation.find({ user: req.user._id }).sort({ startsAt: -1 }).limit(100).populate('service');
    res.json({ reservations: reservations.map((r) => r.toPublic()) });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('service');
    if (!reservation) throw new AppError(404, 'Reserva no encontrada', 'reservation_not_found');

    const isOwner = reservation.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      throw new AppError(403, 'No tienes permisos para modificar esta reserva', 'forbidden');
    }

    if (reservation.status !== 'cancelled') {
      if (reservation.startsAt <= new Date()) {
        throw new AppError(400, 'No se puede cancelar una reserva que ya ocurrió', 'reservation_past');
      }
      reservation.status = 'cancelled';
      await reservation.save();
    }
    res.json({ reservation: reservation.toPublic() });
  } catch (err) {
    next(err);
  }
}

async function adminList(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      Reservation.find(filter).sort({ startsAt: -1 }).skip((page - 1) * limit).limit(limit).populate('service').populate('user', 'name email'),
      Reservation.countDocuments(filter)
    ]);
    res.json({ reservations: items.map((r) => r.toPublic()), page, limit, total });
  } catch (err) {
    next(err);
  }
}

async function adminUpdate(req, res, next) {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('service').populate('user', 'name email');
    if (!reservation) throw new AppError(404, 'Reserva no encontrada', 'reservation_not_found');
    reservation.status = req.body.status;
    try {
      await reservation.save();
    } catch (err) {
      if (err.code === 11000) throw new AppError(409, 'Ese horario ya fue reservado por otra persona', 'slot_taken');
      throw err;
    }
    res.json({ reservation: reservation.toPublic() });
  } catch (err) {
    next(err);
  }
}

async function adminRemove(req, res, next) {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) throw new AppError(404, 'Reserva no encontrada', 'reservation_not_found');
    await reservation.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { create, mine, cancel, adminList, adminUpdate, adminRemove };
