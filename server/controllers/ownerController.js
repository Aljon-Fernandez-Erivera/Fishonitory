const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { randomInt } = require("crypto");
const User = require("../models/User");

const pendingStaffOTPs = new Map();

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

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
  if (!/^\d{7,15}$/.test(staffPhoneNumber)) {
    return res
      .status(400)
      .json({ message: "Staff phone number must contain 7 to 15 digits." });
  }
  if (await User.findOne({ email })) {
    return res.status(400).json({ message: "Email Already In Use" });
  }

  const otp = randomInt(100000, 1000000);
  pendingStaffOTPs.set(email, {
    staffName: staffName.trim(),
    staffPosition: staffPosition.trim(),
    staffEmail: email,
    staffPassword,
    staffPhoneNumber,
    otp,
    ownerId: req.user.userId,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  try {
    await createTransporter().sendMail({
      from: `"Fishonitory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Fishonitory - Staff Registration OTP",
      text: `Your staff registration OTP is ${otp}. It expires in 5 minutes.`,
    });
    return res.json({ message: "OTP sent to the staff email." });
  } catch (error) {
    pendingStaffOTPs.delete(email);
    return res.status(500).json({ message: "OTP could not be sent." });
  }
};

exports.createStaff = async (req, res) => {
  if (!ownerOnly(req, res)) return;

  const { staffEmail, otp } = req.body;
  const email = staffEmail?.trim().toLowerCase();
  const pending = pendingStaffOTPs.get(email);
  if (!pending || Date.now() > pending.expiresAt) {
    pendingStaffOTPs.delete(email);
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
      email: pending.staffEmail,
      password: pending.staffPassword,
      phoneNumber: pending.staffPhoneNumber,
      otp: pending.otp,
      role: pending.staffPosition === "Master Staff" ? "masterStaff" : "Staff",
      ownerId: pending.ownerId,
    });
    pendingStaffOTPs.delete(email);
    return res
      .status(201)
      .json({ message: "Staff account created successfully.", staff });
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
  if (!/^\d{7,15}$/.test(staffPhoneNumber)) {
    return res
      .status(400)
      .json({ message: "Staff phone number must contain 7 to 15 digits." });
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

exports.deleteStaff = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  const staff = await User.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.userId,
    role: { $in: ["Staff", "masterStaff"] },
  });
  if (!staff)
    return res.status(404).json({ message: "Staff account not found." });
  return res.json({ message: "Staff account deleted successfully." });
};
