const Attendance = require("../models/Attendance");

exports.recordStaffAttendance = async (req, res) => {
  if (req.user.role !== "Staff") {
    return res
      .status(403)
      .json({ message: "This account cannot record attendance." });
  }

  const dateKey = new Date().toISOString().slice(0, 10);

  try {
    const attendance = await Attendance.create({
      userId: req.user.userId,
      dateKey,
      status: "Present",
    });

    return res.status(201).json({
      message: "Attendance recorded successfully.",
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({
        message: "Attendance was already recorded for today.",
      });
    }

    console.error("Attendance recording error:", error);
    return res.status(500).json({ message: "Failed to record attendance." });
  }
};

exports.listAttendance = async (req, res) => {
  if (req.user.role !== "Owner")
    return res
      .status(403)
      .json({ message: "Only owners can view attendance." });
  const User = require("../models/User");
  const staffIds = await User.find({
    ownerId: req.user.userId,
    role: "Staff",
    staffPosition: { $ne: "Master Staff" },
  }).distinct("_id");
  const records = await Attendance.find({
    userId: { $in: [req.user.userId, ...staffIds] },
  })
    .populate("userId", "ownerName staffName staffPosition email role")
    .sort({ dateKey: -1, checkIn: -1 });
  return res.json({ records });
};

exports.updateAttendanceStatus = async (req, res) => {
  if (req.user.role !== "Owner")
    return res
      .status(403)
      .json({ message: "Only owners can update attendance." });
  if (
    !["Present", "Late", "Absent", "Leave", "DayOff"].includes(req.body.status)
  ) {
    return res.status(400).json({ message: "Invalid attendance status." });
  }
  const User = require("../models/User");
  const staffIds = await User.find({
    ownerId: req.user.userId,
    role: "Staff",
    staffPosition: { $ne: "Master Staff" },
  }).distinct("_id");
  const record = await Attendance.findOneAndUpdate(
    { _id: req.params.id, userId: { $in: [req.user.userId, ...staffIds] } },
    { status: req.body.status },
    { new: true },
  );
  if (!record)
    return res.status(404).json({ message: "Attendance record not found." });
  await User.findByIdAndUpdate(record.userId, {
    accountStatus: ["Present", "Late"].includes(req.body.status)
      ? "Active"
      : "Disabled",
  });
  return res.json({ message: "Attendance status updated.", record });
};

exports.setStaffAttendance = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can set attendance." });
  const { staffId, dateKey, status } = req.body;
  if (
    !staffId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateKey || "") ||
    !["Present", "Late", "Absent", "Leave", "DayOff"].includes(status)
  ) {
    return res
      .status(400)
      .json({
        message: "Staff, date, and a valid attendance status are required.",
      });
  }
  const User = require("../models/User");
  const staff = await User.findOne({
    _id: staffId,
    ownerId: req.user.userId,
    role: "Staff",
    staffPosition: { $ne: "Master Staff" },
  });
  if (!staff)
    return res.status(404).json({ message: "Staff account not found." });

  const record = await Attendance.findOneAndUpdate(
    { userId: staffId, dateKey },
    {
      $set: {
        status,
        checkIn: ["Present", "Late"].includes(status) ? new Date() : null,
      },
      $setOnInsert: { userId: staffId, dateKey },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await User.findByIdAndUpdate(staffId, {
    accountStatus: ["Present", "Late"].includes(status) ? "Active" : "Disabled",
  });
  return res.json({ message: "Staff attendance updated.", record });
};

exports.deleteAttendance = async (req, res) => {
  if (req.user.role !== "Owner") {
    return res
      .status(403)
      .json({ message: "Only owners can delete attendance." });
  }
  const User = require("../models/User");
  const staffIds = await User.find({
    ownerId: req.user.userId,
    role: "Staff",
    staffPosition: { $ne: "Master Staff" },
  }).distinct("_id");
  const record = await Attendance.findOneAndDelete({
    _id: req.params.id,
    userId: { $in: [req.user.userId, ...staffIds] },
  });
  if (!record)
    return res.status(404).json({ message: "Attendance record not found." });
  return res.json({ message: "Attendance record deleted successfully." });
};
