const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80, unique: true },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    durationMinutes: { type: Number, required: true, min: 15, max: 240 },
    price: { type: Number, required: true, min: 0, max: 10000000 },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

serviceSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    durationMinutes: this.durationMinutes,
    price: this.price,
    active: this.active
  };
};

module.exports = mongoose.model('Service', serviceSchema);
