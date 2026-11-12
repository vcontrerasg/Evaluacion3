const mongoose = require('mongoose');

const STATUSES = ['pending', 'confirmed', 'cancelled'];

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    startsAt: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: STATUSES, default: 'pending' },
    blocksSlot: { type: Boolean, default: true }
  },
  { timestamps: true }
);

reservationSchema.pre('save', function syncSlot(next) {
  this.blocksSlot = this.status !== 'cancelled';
  next();
});

reservationSchema.index({ service: 1, startsAt: 1 }, { unique: true, partialFilterExpression: { blocksSlot: true } });
reservationSchema.index({ user: 1, startsAt: -1 });
reservationSchema.index({ status: 1, startsAt: 1 });

function ref(doc) {
  return doc && doc._id ? doc : null;
}

reservationSchema.methods.toPublic = function toPublic() {
  const service = ref(this.service);
  const user = ref(this.user);
  return {
    id: this._id.toString(),
    status: this.status,
    startsAt: this.startsAt,
    notes: this.notes,
    createdAt: this.createdAt,
    service: service
      ? { id: service._id.toString(), name: service.name, durationMinutes: service.durationMinutes, price: service.price }
      : null,
    user: user && user.email ? { id: user._id.toString(), name: user.name, email: user.email } : undefined
  };
};

module.exports = mongoose.model('Reservation', reservationSchema);
module.exports.STATUSES = STATUSES;
