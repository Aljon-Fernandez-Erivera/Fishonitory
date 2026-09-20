const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const businessFeaturesSchema = new mongoose.Schema(
  {
    staff: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    inventory: { type: Boolean, default: true },
    tanks: { type: Boolean, default: true },
    notes: { type: Boolean, default: true },
    sales: { type: Boolean, default: true },
    payroll: { type: Boolean, default: true },
    operations: { type: Boolean, default: true },
  },
  { _id: false },
);

const attendancePolicySchema = new mongoose.Schema(
  {
    clockInTime: { type: String, default: "07:00" }, // "HH:mm", 24-hr
    graceMinutes: { type: Number, default: 15 },      // minutes after clockInTime before "Late"
    cutoffTime: { type: String, default: "18:00" },   // after this, no-shows become "Absent"
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: function () {
        return this.role === "Owner";
      },
      trim: true,
      minlength: [3, "Business name must be at least 3 characters"],
      maxlength: [100, "Business name cannot exceed 100 characters"],
    },
    ownerName: {
      type: String,
      required: function () {
        return this.role === "Owner";
      },
      trim: true,
      minlength: [2, "Owner name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    businessAddress: {
      type: String,
      required: function () {
        return this.role === "Owner";
      },
      trim: true,
      maxlength: [255, "Business address cannot exceed 255 characters"],
    },
    phoneNumber: {
      type: String, // Stored in E.164 format, e.g. +639171234567
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^\+[1-9]\d{6,14}$/,
        "Please enter a valid international phone number in E.164 format",
      ],
    },
    otp: {
      type: Number,
      required: [true, "OTP verification is required"],
    },
    staffName: {
      type: String,
      trim: true,
      minlength: 2,
      required: function () {
        return ["Staff", "masterStaff"].includes(this.role);
      },
    },
    staffPosition: {
      type: String,
      trim: true,
      minlength: 2,
      required: function () {
        return ["Staff", "masterStaff"].includes(this.role);
      },
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return ["Staff", "masterStaff"].includes(this.role);
      },
    },
    accountStatus: {
      type: String,
      enum: ["Active", "Disabled"],
      default: "Active",
    },
    failedLoginAttempts: {
      type: Number,
      min: 0,
      default: 0,
    },
    loginLockedUntil: {
      type: Date,
      default: null,
    },
    totpEnabled: { type: Boolean, default: false },
    totpSecretCiphertext: { type: String, default: "", select: false },
    totpSetupCiphertext: { type: String, default: "", select: false },
    totpSetupExpiresAt: { type: Date, default: null, select: false },
    totpRecoveryCodeHashes: { type: [String], default: [], select: false },
    totpLastUsedCounter: { type: Number, default: -1, select: false },
    totpFailedAttempts: { type: Number, default: 0, select: false },
    totpLockedUntil: { type: Date, default: null, select: false },
    // Feature choices belong to the owner account. Turning one off never
    // deletes its records; it only removes it from the owner workspace.
    businessFeatures: { type: businessFeaturesSchema, default: () => ({}) },
    workspaceSetupCompleted: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["Owner", "Staff", "masterStaff"],
      default: "Owner",
    },
    attendancePolicy: { type: attendancePolicySchema, default: () => ({}) },
  },
  { timestamps: true },
);

// Hash password via bcrypt before saving to MongoDB Atlas
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model("User", userSchema);
