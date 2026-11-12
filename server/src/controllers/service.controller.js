const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const Service = require('../models/Service');
const Reservation = require('../models/Reservation');
const { slotsForDate, isBusinessSlot, withinBookingWindow } = require('../utils/time');

async function listPublic(req, res, next) {
  try {
    const services = await Service.find({ active: true }).sort({ name: 1 });
    res.json({ services: services.map((s) => s.toPublic()) });
  } catch (err) {
    next(err);
  }
}

async function availability(req, res, next) {
  try {
    const service = await Service.findOne({ _id: req.params.id, active: true });
    if (!service) throw new AppError(404, 'El servicio no existe o no está disponible', 'service_not_found');

    const slots = slotsForDate(req.query.date);
    if (!slots) throw new AppError(400, 'La fecha indicada no es válida', 'invalid_date');
    if (slots.length === 0) return res.json({ date: req.query.date, slots: [] });

    const taken = await Reservation.find({
      service: service._id,
      blocksSlot: true,
      startsAt: mongoose.trusted({ $in: slots })
    }).select('startsAt');
    const takenSet = new Set(taken.map((r) => r.startsAt.getTime()));

    const now = new Date();
    res.json({
      date: req.query.date,
      slots: slots.map((s) => ({
        startsAt: s.toISOString(),
        available: withinBookingWindow(s, now) && isBusinessSlot(s) && !takenSet.has(s.getTime())
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function adminList(req, res, next) {
  try {
    const services = await Service.find({}).sort({ createdAt: -1 });
    res.json({ services: services.map((s) => s.toPublic()) });
  } catch (err) {
    next(err);
  }
}

async function adminCreate(req, res, next) {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ service: service.toPublic() });
  } catch (err) {
    if (err.code === 11000) return next(new AppError(409, 'Ya existe un servicio con ese nombre', 'service_exists'));
    return next(err);
  }
}

async function adminUpdate(req, res, next) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) throw new AppError(404, 'Servicio no encontrado', 'service_not_found');
    Object.assign(service, req.body);
    await service.save();
    res.json({ service: service.toPublic() });
  } catch (err) {
    if (err.code === 11000) return next(new AppError(409, 'Ya existe un servicio con ese nombre', 'service_exists'));
    return next(err);
  }
}

async function adminRemove(req, res, next) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) throw new AppError(404, 'Servicio no encontrado', 'service_not_found');

    const used = await Reservation.exists({ service: service._id });
    if (used) {
      throw new AppError(409, 'El servicio tiene reservas asociadas. Desactívalo en lugar de eliminarlo', 'service_in_use');
    }
    await service.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listPublic, availability, adminList, adminCreate, adminUpdate, adminRemove };
