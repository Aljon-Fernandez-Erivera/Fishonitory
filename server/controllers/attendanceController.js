const Attendance = require("../models/Attendance");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { writeAudit } = require("../utils/audit");
const { getManilaDateKey } = require("../utils/dateKey");


function isLate(policy) {
  const [h, m] = (policy?.clockInTime || "07:00").split(":").map(Number);
  const grace = policy?.graceMinutes ?? 15;
  const threshold = new Date();
  threshold.setHours(h, m + grace, 0, 0);
  return new Date() > threshold;
}

function isPastCutoff(policy) {
  const [h, m] = (policy?.cutoffTime || "18:00").split(":").map(Number);
  const threshold = new Date();
  threshold.setHours(h, m, 0, 0);
  return new Date() > threshold;
}

exports.recordStaffAttendance = async (req, res) => {
  if (req.user.role !== "Staff") {
    return res
      .status(403)
      .json({ message: "This account cannot record attendance." });
  }

  const dateKey = getManilaDateKey();

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

  const owner = await User.findById(req.user.userId, "attendancePolicy");
  const dateKey = getManilaDateKey();
  const staffIds = await User.find({
    ownerId: req.user.userId,
    role: "Staff",
  }).distinct("_id");

  if (isPastCutoff(owner?.attendancePolicy)) {
    const alreadyRecorded = await Attendance.find({
      userId: { $in: staffIds },
      dateKey,
    }).distinct("userId");
    const noShows = staffIds.filter(
      (id) =>
        !alreadyRecorded.some(
          (recordedId) => String(recordedId) === String(id),
        ),
    );
    if (noShows.length) {
      await Attendance.insertMany(
        noShows.map((userId) => ({ userId, dateKey, status: "Absent" })),
        { ordered: false },
      ).catch(() => {}); // duplicate-key races from concurrent requests are fine to ignore
    }
  }

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
  const staffIds = await User.find({
    ownerId: req.user.userId,
    role: "Staff",
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
    return res.status(400).json({
      message: "Staff, date, and a valid attendance status are required.",
    });
  }
  const staff = await User.findOne({
    _id: staffId,
    ownerId: req.user.userId,
    role: "Staff",
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

exports.clockOut = async (req, res) => {
  if (req.user.role !== "Staff") {
    return res
      .status(403)
      .json({ message: "This account cannot record attendance." });
  }

  const dateKey = getManilaDateKey();
  const record = await Attendance.findOne({ userId: req.user.userId, dateKey });

  if (!record || !record.checkIn) {
    return res
      .status(400)
      .json({ message: "You haven't clocked in today yet." });
  }
  if (record.checkOut) {
    return res
      .status(200)
      .json({ message: "You already clocked out today.", record });
  }

  record.checkOut = new Date();
  await record.save();

  return res.json({ message: "Clocked out successfully.", record });
};

exports.getTodayStatus = async (req, res) => {
  if (req.user.role !== "Staff") {
    return res
      .status(403)
      .json({ message: "This account cannot view attendance." });
  }
  const dateKey = getManilaDateKey();
  const record = await Attendance.findOne({ userId: req.user.userId, dateKey });
  return res.json({ record: record || null });
};

// The manager opens this station for staff. A staff member proves their own
// identity with their credentials; Master Staff accounts are never clocked.
exports.staffTimeClock = async (req, res) => {
  try {
    const { email, password, action } = req.body || {};
    if (!/^(clock-in|clock-out)$/.test(String(action)))
      return res.status(400).json({ message: "Choose clock in or clock out." });
    const staff = await User.findOne({
      email: String(email || "")
        .trim()
        .toLowerCase(),
      role: "Staff",
      accountStatus: "Active",
    });
    if (
      !staff ||
      !(await bcrypt.compare(String(password || ""), staff.password))
    )
      return res
        .status(401)
        .json({ message: "Invalid staff email or password." });
    const dateKey = getManilaDateKey();
    let record = await Attendance.findOne({ userId: staff._id, dateKey });
    if (action === "clock-in") {
      if (record?.checkIn)
        return res
          .status(200)
          .json({ message: "You are already clocked in today.", record });

      const owner = await User.findById(staff.ownerId, "attendancePolicy");
      const status = isLate(owner?.attendancePolicy) ? "Late" : "Present";

      record = await Attendance.findOneAndUpdate(
        { userId: staff._id, dateKey },
        {
          $set: { status, checkIn: new Date(), checkOut: null },
          $setOnInsert: { userId: staff._id, dateKey },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await writeAudit(
        { user: { userId: staff._id, role: "Staff" } },
        "CLOCK_IN",
        "Attendance",
        record._id,
        `${staff.staffName} clocked in (${status}).`,
      );
      return res.json({ message: "Attendance recorded successfully.", record });
    }
    if (!record?.checkIn)
      return res
        .status(400)
        .json({ message: "Clock in before ending your shift." });
    if (record.checkOut)
      return res
        .status(200)
        .json({ message: "You already clocked out today.", record });
    record.checkOut = new Date();
    await record.save();
    await writeAudit(
      { user: { userId: staff._id, role: "Staff" } },
      "CLOCK_OUT",
      "Attendance",
      record._id,
      `${staff.staffName} clocked out.`,
    );
    return res.json({ message: "Clock-out recorded successfully.", record });
  } catch (error) {
    console.error("Staff time clock failed:", error.message);
    return res
      .status(500)
      .json({
        message: "We could not record the time entry. Please try again.",
      });
  }
};

exports.getAttendancePolicy = async (req, res) => {
  if (req.user.role !== "Owner")
    return res
      .status(403)
      .json({ message: "Only owners can view attendance policy." });
  const owner = await User.findById(req.user.userId, "attendancePolicy");
  return res.json({ attendancePolicy: owner?.attendancePolicy || {} });
};

exports.updateAttendancePolicy = async (req, res) => {
  if (req.user.role !== "Owner")
    return res
      .status(403)
      .json({ message: "Only owners can set attendance policy." });
  const { clockInTime, graceMinutes, cutoffTime } = req.body;
  if (
    !/^\d{2}:\d{2}$/.test(clockInTime || "") ||
    !/^\d{2}:\d{2}$/.test(cutoffTime || "")
  ) {
    return res
      .status(400)
      .json({ message: "Provide valid clock-in and cutoff times." });
  }
  const owner = await User.findByIdAndUpdate(
    req.user.userId,
    {
      attendancePolicy: {
        clockInTime,
        graceMinutes: Number(graceMinutes) || 0,
        cutoffTime,
      },
    },
    { new: true, runValidators: true },
  );
  return res.json({
    message: "Attendance policy updated.",
    attendancePolicy: owner.attendancePolicy,
  });
};
