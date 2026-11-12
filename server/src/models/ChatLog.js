const mongoose = require('mongoose');

const SOURCES = ['faq', 'ai', 'fallback', 'greeting'];
const RETENTION_DAYS = 30;

const chatLogSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    message: { type: String, required: true, maxlength: 300 },
    reply: { type: String, required: true, maxlength: 800 },
    source: { type: String, enum: SOURCES, required: true },
    faq: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatFaq', default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

chatLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });
chatLogSchema.index({ source: 1, createdAt: -1 });

chatLogSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    sessionId: this.sessionId.slice(0, 8),
    message: this.message,
    reply: this.reply,
    source: this.source,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('ChatLog', chatLogSchema);
module.exports.SOURCES = SOURCES;
module.exports.RETENTION_DAYS = RETENTION_DAYS;
