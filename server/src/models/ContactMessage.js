const mongoose = require('mongoose');

const STATUSES = ['new', 'read', 'archived'];
const MAIL_STATES = ['sent', 'failed', 'skipped', 'pending'];

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 120, index: true },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    subject: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: STATUSES, default: 'new' },
    mail: {
      notification: { type: String, enum: MAIL_STATES, default: 'pending' },
      confirmation: { type: String, enum: MAIL_STATES, default: 'pending' }
    },
    ipHash: { type: String, default: '' }
  },
  { timestamps: true }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

contactMessageSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    subject: this.subject,
    message: this.message,
    status: this.status,
    mail: { notification: this.mail.notification, confirmation: this.mail.confirmation },
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
module.exports.STATUSES = STATUSES;
