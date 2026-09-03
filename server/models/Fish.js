const mongoose = require('mongoose');

const fishSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    species: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
    photoUrl: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Fish', fishSchema);
