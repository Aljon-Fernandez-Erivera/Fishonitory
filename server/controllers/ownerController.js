const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { randomInt } = require("crypto");
const crypto = require("crypto");
const User = require("../models/User");
const PendingStaffRegistration = require("../models/PendingStaffRegistration");
const config = require("../config/config");

const FEATURE_KEYS = [
  "staff",
  "attendance",
  "inventory",
  "tanks",
  "notes",
  "sales",
  "payroll",
  "operations",
];
const DEFAULT_BUSINESS_FEATURES = Object.freeze(
  Object.fromEntries(FEATURE_KEYS.map((key) => [key, true])),
);

// Kept separate from staff-registration, owner-registration, and password-reset
// codes so a code issued for one action can never authorize another action.
const pendingStaffDeletionOTPs = new Map();

const deletionOtpKey = (ownerId, staffId) => `${ownerId}:${staffId}`;
const pendingPasswordKey = crypto
  .createHash("sha256")
  .update(config.jwtSecret)
  .digest();

const encryptPendingPassword = (password) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", pendingPasswordKey, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
};

const decryptPendingPassword = (ciphertext) => {
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    pendingPasswordKey,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
};

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

function normaliseBusinessFeatures(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Business features must be a valid settings object.");
  }

  const unknownKeys = Object.keys(input).filter((key) => !FEATURE_KEYS.includes(key));
  if (unknownKeys.length) throw new Error("Business features contain an unsupported option.");

  const features = { ...DEFAULT_BUSINESS_FEATURES };
  for (const key of FEATURE_KEYS) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "boolean") {
        throw new Error(`${key} must be enabled or disabled.`);
      }
      features[key] = input[key];
    }
  }

  // Payroll needs staff records and attendance data to calculate pay safely.
  if (!features.staff) {
    features.attendance = false;
    features.payroll = false;
  } else if (!features.attendance) {
    features.payroll = false;
  }
  return features;
}

exports.getWorkspaceSettings = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  const owner = await User.findById(req.user.userId).select(
    "businessFeatures workspaceSetupCompleted",
  );
  if (!owner) return res.status(404).json({ message: "Owner account not found." });

  return res.json({
    features: { ...DEFAULT_BUSINESS_FEATURES, ...(owner.businessFeatures?.toObject?.() || owner.businessFeatures || {}) },
    setupCompleted: Boolean(owner.workspaceSetupCompleted),
  });
};

exports.updateWorkspaceSettings = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  try {
    const features = normaliseBusinessFeatures(req.body?.features);
    const owner = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { businessFeatures: features, workspaceSetupCompleted: true } },
      { new: true, runValidators: true },
    ).select("businessFeatures workspaceSetupCompleted");
    if (!owner) return res.status(404).json({ message: "Owner account not found." });

    return res.json({
      message: "Workspace settings saved. Your existing business records were kept.",
      features: owner.businessFeatures,
      setupCompleted: owner.workspaceSetupCompleted,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Workspace settings are invalid." });
  }
};

const ownerOnly = (req, res) => {
  if (req.user.role !== "Owner") {
    res
      .status(403)
      .json({ message: "Only owner accounts can perform this action." });
    return false;
  }
  return true;
};

exports.sendStaffOtp = async (req, res) => {
  if (!ownerOnly(req, res)) return;

  const {
    staffName,
    staffPosition,
    staffEmail,
    staffPassword,
    staffPhoneNumber,
  } = req.body;
  if (
    !staffName ||
    !staffPosition ||
    !staffEmail ||
    !staffPassword ||
    !staffPhoneNumber
  ) {
    return res.status(400).json({ message: "All staff fields are required." });
  }

  const email = staffEmail.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res
      .status(400)
      .json({ message: "Enter a valid staff email address." });
  }
  if (staffPassword.length < 8) {
    return res
      .status(400)
      .json({ message: "Staff password must be at least 8 characters." });
  }
  if (!/^\+[1-9]\d{6,14}$/.test(staffPhoneNumber)) {
    return res
      .status(400)
      .json({ message: "Staff phone number must use international E.164 format." });
  }
  if (await User.findOne({ email })) {
    return res.status(400).json({ message: "Email Already In Use" });
  }

  const otp = randomInt(100000, 1000000);
  const pendingData = {
    staffName: staffName.trim(),
    staffPosition: staffPosition.trim(),
    phoneNumber: staffPhoneNumber,
    passwordCiphertext: encryptPendingPassword(staffPassword),
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };

  await PendingStaffRegistration.findOneAndUpdate(
    { ownerId: req.user.userId, email },
    { $set: pendingData, $setOnInsert: { ownerId: req.user.userId, email } },
    { upsert: true, new: true, runValidators: true },
  );

  try {
    await createTransporter().sendMail({
      from: `"Fishonitory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Fishonitory - Staff Registration OTP",
      text: `Your staff registration OTP is ${otp}. It expires in 5 minutes.`,
    });
    return res.json({ message: "OTP sent to the staff email." });
  } catch (error) {
    await PendingStaffRegistration.deleteOne({ ownerId: req.user.userId, email });
    return res.status(500).json({ message: "OTP could not be sent." });
  }
};

exports.createStaff = async (req, res) => {
  if (!ownerOnly(req, res)) return;

  const { staffEmail, otp } = req.body;
  const email = staffEmail?.trim().toLowerCase();
  const pending = await PendingStaffRegistration.findOne({
    ownerId: req.user.userId,
    email,
  });
  if (!pending || Date.now() > pending.expiresAt.getTime()) {
    await PendingStaffRegistration.deleteOne({ ownerId: req.user.userId, email });
    return res.status(400).json({ message: "OTP is missing or expired." });
  }
  if (String(otp) !== String(pending.otp)) {
    return res
      .status(400)
      .json({ message: "Incorrect OTP. Please try again." });
  }

  try {
    const staff = await User.create({
      staffName: pending.staffName,
      staffPosition: pending.staffPosition,
      email: pending.email,
      password: decryptPendingPassword(pending.passwordCiphertext),
      phoneNumber: pending.phoneNumber,
      otp: pending.otp,
      role: pending.staffPosition === "Master Staff" ? "masterStaff" : "Staff",
      ownerId: pending.ownerId,
    });
    await PendingStaffRegistration.deleteOne({ _id: pending._id });
    return res.status(201).json({
      message: "Staff account created successfully.",
      staff: {
        id: staff._id,
        staffName: staff.staffName,
        staffPosition: staff.staffPosition,
        email: staff.email,
        phoneNumber: staff.phoneNumber,
        role: staff.role,
        accountStatus: staff.accountStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ message: "Email Already In Use" });
    return res
      .status(500)
      .json({ message: error.message || "Failed to create staff account." });
  }
};

exports.listStaff = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  const staff = await User.find({
    ownerId: req.user.userId,
    role: { $in: ["Staff", "masterStaff"] },
  })
    .select("-password -otp")
    .sort({ createdAt: -1 });
  return res.json({ staff });
};

exports.updateStaffStatus = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  const { status } = req.body;
  if (!["Active", "Disabled"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Staff status must be Active or Disabled." });
  }
  const staff = await User.findOneAndUpdate(
    {
      _id: req.params.id,
      ownerId: req.user.userId,
      role: { $in: ["Staff", "masterStaff"] },
    },
    { accountStatus: status },
    { new: true },
  ).select("-password -otp");
  if (!staff)
    return res.status(404).json({ message: "Staff account not found." });
  return res.json({ message: "Staff account status updated.", staff });
};

exports.updateStaff = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  const {
    staffName,
    staffPosition,
    staffEmail,
    staffPassword,
    staffPhoneNumber,
  } = req.body;
  if (!staffName || !staffPosition || !staffEmail || !staffPhoneNumber) {
    return res
      .status(400)
      .json({
        message: "Staff name, position, email, and phone are required.",
      });
  }
  const email = staffEmail.trim().toLowerCase();
  const duplicate = await User.findOne({ email, _id: { $ne: req.params.id } });
  if (duplicate)
    return res.status(400).json({ message: "Email Already In Use" });
  if (!/^\+[1-9]\d{6,14}$/.test(staffPhoneNumber)) {
    return res
      .status(400)
      .json({ message: "Staff phone number must use international E.164 format." });
  }

  const updates = {
    staffName: staffName.trim(),
    staffPosition: staffPosition.trim(),
    email,
    phoneNumber: staffPhoneNumber,
    role: staffPosition.trim() === "Master Staff" ? "masterStaff" : "Staff",
  };
  if (staffPassword) {
    if (staffPassword.length < 8)
      return res
        .status(400)
        .json({ message: "Staff password must be at least 8 characters." });
    updates.password = await bcrypt.hash(staffPassword, 10);
  }
  const staff = await User.findOneAndUpdate(
    {
      _id: req.params.id,
      ownerId: req.user.userId,
      role: { $in: ["Staff", "masterStaff"] },
    },
    updates,
    { new: true, runValidators: true },
  ).select("-password -otp");
  if (!staff)
    return res.status(404).json({ message: "Staff account not found." });
  return res.json({ message: "Staff account updated successfully.", staff });
};

exports.sendStaffDeletionOtp = async (req, res) => {
  if (!ownerOnly(req, res)) return;

  const staff = await User.findOne({
    _id: req.params.id,
    ownerId: req.user.userId,
    role: { $in: ["Staff", "masterStaff"] },
  }).select("_id staffName");
  if (!staff)
    return res.status(404).json({ message: "Staff account not found." });

  const owner = await User.findById(req.user.userId).select("email");
  if (!owner?.email)
    return res.status(400).json({ message: "Owner email address is unavailable." });

  const otp = randomInt(100000, 1000000);
  const key = deletionOtpKey(req.user.userId, staff._id);
  pendingStaffDeletionOTPs.set(key, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  try {
    await createTransporter().sendMail({
      from: `"Fishonitory" <${process.env.EMAIL_USER}>`,
      to: owner.email,
      subject: "Fishonitory - Staff Account Deletion Verification",
      text: `Your deletion verification code for ${staff.staffName}'s staff account is ${otp}. It expires in 5 minutes. Do not share this code.`,
    });
    return res.json({ message: "A deletion verification code has been sent to your owner email." });
  } catch (error) {
    pendingStaffDeletionOTPs.delete(key);
    return res.status(503).json({ message: "We could not send the deletion verification code. Please try again." });
  }
};

exports.deleteStaff = async (req, res) => {
  if (!ownerOnly(req, res)) return;

  const key = deletionOtpKey(req.user.userId, req.params.id);
  const pending = pendingStaffDeletionOTPs.get(key);
  if (!pending || Date.now() > pending.expiresAt) {
    pendingStaffDeletionOTPs.delete(key);
    return res.status(400).json({ message: "Deletion verification code is missing or expired. Request a new code." });
  }
  if (String(req.body.otp) !== String(pending.otp)) {
    return res.status(400).json({ message: "Incorrect deletion verification code. Please try again." });
  }

  const staff = await User.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.userId,
    role: { $in: ["Staff", "masterStaff"] },
  });
  if (!staff)
    return res.status(404).json({ message: "Staff account not found." });

  pendingStaffDeletionOTPs.delete(key);
  return res.json({ message: "Staff account deleted successfully." });
};
