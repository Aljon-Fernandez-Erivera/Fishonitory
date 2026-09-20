const Attendance = require("../models/Attendance");
const Payroll = require("../models/Payroll");
const User = require("../models/User");
const { writeAudit } = require("../utils/audit");

function ownerOnly(req, res) {
  if (req.user.role === "Owner") return true;
  res.status(403).json({ message: "Only owners can access payroll." });
  return false;
}

exports.listPayroll = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  const payroll = await Payroll.find({ ownerId: req.user.userId })
    .populate("staffId", "staffName staffPosition email")
    .sort({ period: -1, updatedAt: -1 });
  return res.json({ payroll });
};

exports.savePayroll = async (req, res) => {
  if (!ownerOnly(req, res)) return;

  const { staffId, periodType, periodStart, periodEnd, dailyRate, benefitItems = [], notes = "" } = req.body;

  // 1. Validate required strings & dates
  if (
    !staffId ||
    !["weekly", "fifteenDays", "monthly"].includes(periodType) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(periodStart || "") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd || "") ||
    periodStart > periodEnd
  ) {
    return res.status(400).json({ message: "A staff member and valid payroll period are required." });
  }

  // 2. Validate Daily Rate
  const rate = Number(dailyRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100000) {
    return res.status(400).json({ message: "Daily rate must be a valid non-negative number up to ₱100,000." });
  }

  // 3. Validate additions and deductions separately.
  if (!Array.isArray(benefitItems) || benefitItems.length > 30) {
    return res.status(400).json({ message: "Deduction items must be a valid array (max 30 items)." });
  }

  const items = [];
  for (const item of benefitItems) {
    const itemName = String(item?.name || "").trim();
    const itemAmount = Number(item?.amount);

    if (!itemName || itemName.length > 80) {
      return res.status(400).json({ message: "Each payroll adjustment must have a valid name (up to 80 characters)." });
    }
    if (!Number.isFinite(itemAmount) || itemAmount <= 0 || itemAmount > 100000) {
      return res.status(400).json({ message: `Invalid deduction amount for '${itemName}'. Must be greater than 0.` });
    }
    if (!["addition", "deduction"].includes(item?.type)) {
      return res.status(400).json({ message: "Each payroll adjustment must be an addition or deduction." });
    }
    items.push({ name: itemName, amount: itemAmount, type: item.type });
  }

  // 4. Validate notes length
  if (typeof notes !== "string" || notes.length > 1000) {
    return res.status(400).json({ message: "Payroll notes must be 1,000 characters or fewer." });
  }

  // 5. Verify staff exists and belongs to owner
  const staff = await User.findOne({ _id: staffId, ownerId: req.user.userId, role: "Staff" });
  if (!staff) return res.status(404).json({ message: "Staff account not found." });

  // 6. Calculate total days, gross pay, deductions, and net pay
  const records = await Attendance.find({ userId: staff._id, dateKey: { $gte: periodStart, $lte: periodEnd } });
  const presentDays = records.filter((record) => record.status === "Present").length;
  const lateDays = records.filter((record) => record.status === "Late").length;
  const payableDays = presentDays + lateDays;

  const benefits = items
    .filter((item) => item.type === "addition")
    .reduce((total, item) => total + item.amount, 0);
  const grossPay = payableDays * rate + benefits;
  const deductions = items
    .filter((item) => item.type === "deduction")
    .reduce((total, item) => total + item.amount, 0);
  const netPay = grossPay - deductions;

  // 7. Security guard: Prevent negative net pay calculations
  if (netPay < 0) {
    return res.status(400).json({ message: "Total deductions exceed gross pay. Net pay cannot be negative." });
  }

  const period = `${periodStart} to ${periodEnd}`;

  // 8. Upsert payroll entry safely
  const payroll = await Payroll.findOneAndUpdate(
    { ownerId: req.user.userId, staffId, periodStart, periodEnd },
    {
      ownerId: req.user.userId,
      staffId,
      staffName: staff.staffName,
      period,
      periodType,
      periodStart,
      periodEnd,
      dailyRate: rate,
      presentDays,
      lateDays,
      payableDays,
      benefits,
      benefitItems: items,
      deductions,
      grossPay,
      netPay,
      notes: notes.trim(),
      createdBy: req.user.userId,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate("staffId", "staffName staffPosition email");

  await writeAudit(req, "CREATE", "Payroll", payroll._id, `Payroll prepared for ${staff.staffName} (${period})`);
  return res.status(201).json({ message: "Payroll saved successfully.", payroll });
};

exports.deletePayroll = async (req, res) => {
  if (!ownerOnly(req, res)) return;

  const payroll = await Payroll.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.userId,
  });
  if (!payroll) return res.status(404).json({ message: "Payroll record not found." });

  await writeAudit(
    req,
    "DELETE",
    "Payroll",
    payroll._id,
    `Payroll deleted for ${payroll.staffName} (${payroll.period})`
  );
  return res.json({ message: "Payroll record deleted successfully." });
};
