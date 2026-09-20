const mongoose = require("mongoose");

// A short-lived, server-restart-safe record used only while an owner confirms
// a new staff account. MongoDB removes it automatically at expiresAt.
const pendingStaffRegistrationSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    staffName: { type: String, required: true, trim: true },
    staffPosition: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true },
    passwordCiphertext: { type: String, required: true },
    otp: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

pendingStaffRegistrationSchema.index({ ownerId: 1, email: 1 }, { unique: true });
pendingStaffRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model(
  "PendingStaffRegistration",
  pendingStaffRegistrationSchema,
);
