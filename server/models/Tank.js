const mongoose = require("mongoose");

const tankSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "Available",
    },
    nextMaintenance: { type: Date, default: null },
    cleaningFrequencyDays: { type: Number, default: null },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tank", tankSchema);
