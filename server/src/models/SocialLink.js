const mongoose = require('mongoose');

const NETWORKS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'whatsapp'];

const socialLinkSchema = new mongoose.Schema(
  {
    network: { type: String, required: true, enum: NETWORKS, unique: true },
    url: { type: String, required: true, trim: true, maxlength: 200 },
    label: { type: String, trim: true, maxlength: 40, default: '' },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, min: 0, max: 99 }
  },
  { timestamps: true }
);

socialLinkSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    network: this.network,
    url: this.url,
    label: this.label,
    active: this.active,
    order: this.order
  };
};

module.exports = mongoose.model('SocialLink', socialLinkSchema);
module.exports.NETWORKS = NETWORKS;
