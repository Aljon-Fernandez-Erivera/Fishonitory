const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    entityType: { type: String, required: true, trim: true, maxlength: 80 },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    details: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
