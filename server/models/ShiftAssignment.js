const mongoose = require("mongoose");

const shiftAssignmentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateKey: { type: String, required: true },
    shiftTemplateId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

shiftAssignmentSchema.index({ ownerId: 1, staffId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model("ShiftAssignment", shiftAssignmentSchema);