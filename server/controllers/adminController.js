const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { writeAudit } = require("../utils/audit");

// Every business owner currently waiting on a permit review, oldest first so
// the queue is worked in the order it came in.
exports.listPendingOwners = async (req, res) => {
  const pending = await User.find({
    role: "Owner",
    accountStatus: "Pending Verification",
  })
    .select("businessName ownerName email phoneNumber businessAddress businessPermitUrl createdAt")
    .sort({ createdAt: 1 });
  return res.json({ pending });
};

// Every Owner and Staff account across the whole platform, for the Super
// Admin's account-management view. Password/OTP/TOTP internals excluded.
exports.listAllAccounts = async (req, res) => {
  const accounts = await User.find({ role: { $in: ["Owner", "Staff", "masterStaff"] } })
    .select(
      "businessName ownerName staffName staffPosition email role accountStatus ownerId createdAt verifiedAt rejectionReason",
    )
    .sort({ createdAt: -1 });
  return res.json({ accounts });
};

// High-level counts for the Super Admin overview page.
exports.getOverviewStats = async (req, res) => {
  const [totalOwners, pendingOwners, activeOwners, rejectedOwners, totalStaff, disabledAccounts] =
    await Promise.all([
      User.countDocuments({ role: "Owner" }),
      User.countDocuments({ role: "Owner", accountStatus: "Pending Verification" }),
      User.countDocuments({ role: "Owner", accountStatus: "Active" }),
      User.countDocuments({ role: "Owner", accountStatus: "Rejected" }),
      User.countDocuments({ role: { $in: ["Staff", "masterStaff"] } }),
      User.countDocuments({ accountStatus: "Disabled" }),
    ]);
  return res.json({
    totalOwners,
    pendingOwners,
    activeOwners,
    rejectedOwners,
    totalStaff,
    disabledAccounts,
  });
};

// Approve a pending owner: the account becomes Active and can log in.
exports.approveOwner = async (req, res) => {
  const owner = await User.findOne({
    _id: req.params.id,
    role: "Owner",
    accountStatus: "Pending Verification",
  });
  if (!owner) {
    return res.status(404).json({ message: "No pending owner account found with that ID." });
  }

  owner.accountStatus = "Active";
  owner.verifiedBy = req.user.userId;
  owner.verifiedAt = new Date();
  owner.rejectionReason = "";
  await owner.save({ validateBeforeSave: false });

  await writeAudit(
    req,
    "APPROVE",
    "User",
    owner._id,
    `Approved business registration for ${owner.businessName}`,
  );

  return res.json({ message: `${owner.businessName} has been approved and can now log in.` });
};

// Reject a pending owner, with a reason the owner will see on their next
// login attempt. The account stays in the database (not deleted) in case
// the applicant corrects the issue and a resubmission flow is added later.
exports.rejectOwner = async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  if (!reason) {
    return res.status(400).json({ message: "A rejection reason is required." });
  }

  const owner = await User.findOne({
    _id: req.params.id,
    role: "Owner",
    accountStatus: "Pending Verification",
  });
  if (!owner) {
    return res.status(404).json({ message: "No pending owner account found with that ID." });
  }

  owner.accountStatus = "Rejected";
  owner.verifiedBy = req.user.userId;
  owner.verifiedAt = new Date();
  owner.rejectionReason = reason.slice(0, 500);
  await owner.save({ validateBeforeSave: false });

  await writeAudit(
    req,
    "REJECT",
    "User",
    owner._id,
    `Rejected business registration for ${owner.businessName}: ${reason}`,
  );

  return res.json({ message: `${owner.businessName}'s registration has been rejected.` });
};

// Enable or disable any Owner/Staff account platform-wide. Distinct from
// approve/reject, which only applies to first-time Pending Verification.
exports.setAccountStatus = async (req, res) => {
  const { status } = req.body;
  if (!["Active", "Disabled"].includes(status)) {
    return res.status(400).json({ message: "Status must be Active or Disabled." });
  }

  const account = await User.findOne({
    _id: req.params.id,
    role: { $in: ["Owner", "Staff", "masterStaff"] },
  });
  if (!account) return res.status(404).json({ message: "Account not found." });
  if (["Pending Verification", "Rejected"].includes(account.accountStatus)) {
    return res.status(400).json({
      message: "This account has not been through registration review yet. Approve or reject it first.",
    });
  }

  account.accountStatus = status;
  await account.save({ validateBeforeSave: false });

  await writeAudit(
    req,
    status === "Disabled" ? "DISABLE" : "ENABLE",
    "User",
    account._id,
    `Super Admin set account status to ${status} for ${account.email}`,
  );

  return res.json({ message: `Account status updated to ${status}.`, account });
};

// Platform-wide audit log — every business, not scoped to one ownerId like
// the per-business audit trail Owners see in their own dashboard.
exports.listSystemLogs = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const logs = await AuditLog.find({})
    .populate("actorId", "email role businessName staffName")
    .populate("ownerId", "businessName")
    .sort({ createdAt: -1 })
    .limit(limit);
  return res.json({ logs });
};