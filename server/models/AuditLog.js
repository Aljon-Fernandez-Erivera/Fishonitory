const mongoose = require("mongoose");
const auditLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    scope: { type: String, enum: ["business", "platform"], default: "business", index: true },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    details: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ownerId: 1, createdAt: -1 });


module.exports = mongoose.model("AuditLog", auditLogSchema);
