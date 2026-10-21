const mongoose = require("mongoose");

const platformNoticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: ["general", "maintenance", "feature", "policy", "reminder"], default: "general", index: true },
    audience: { type: String, enum: ["all", "approved"], default: "all", index: true },
    expiresAt: { type: Date, default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

platformNoticeSchema.index({ audience: 1, expiresAt: 1, createdAt: -1 });

module.exports = mongoose.model("PlatformNotice", platformNoticeSchema);
