const mongoose = require('mongoose');

const chatFaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    keywords: {
      type: [{ type: String, trim: true, minlength: 2, maxlength: 30 }],
      validate: { validator: (v) => v.length <= 15, message: 'Máximo 15 palabras clave' },
      default: []
    },
    answer: { type: String, required: true, trim: true, minlength: 5, maxlength: 800 },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, min: 0, max: 999 }
  },
  { timestamps: true }
);

chatFaqSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    question: this.question,
    keywords: this.keywords,
    answer: this.answer,
    active: this.active,
    order: this.order
  };
};

module.exports = mongoose.model('ChatFaq', chatFaqSchema);
