const mongoose = require("mongoose");

const loginAttemptSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    failedAttempts: {
      type: Number,
      min: 0,
      default: 0,
    },
    windowStartedAt: {
      type: Date,
      required: true,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Remove inactive IP records after one day without affecting active rate limits.
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model("LoginAttempt", loginAttemptSchema);
