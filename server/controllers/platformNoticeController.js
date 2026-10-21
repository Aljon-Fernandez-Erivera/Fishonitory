const mongoose = require("mongoose");
const PlatformNotice = require("../models/PlatformNotice");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

const ownerAudienceFilter = (owner) => ({
  $and: [
    { dismissedBy: { $nin: [owner._id] } },
    { audience: "approved" },
  ],
});

exports.listForOwner = async (req, res) => {
  try {
    const viewer = await User.findOne({ _id: req.user.userId, role: { $in: ["Owner", "Staff", "masterStaff"] }, accountStatus: "Active" })
      .select("role ownerId accountStatus")
      .lean();
    if (!viewer) return res.status(403).json({ message: "Only approved business accounts can view platform notices." });
    const owner = viewer.role === "Owner" ? viewer : await User.findOne({ _id: viewer.ownerId, role: "Owner", accountStatus: "Active" }).select("_id").lean();
    if (!owner) return res.status(403).json({ message: "This account is not linked to an approved business." });
    const notices = await PlatformNotice.find({ ...ownerAudienceFilter(viewer), audience: "approved" })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ notices });
  } catch (error) {
    console.error("Platform notices load failed:", error);
    return res.status(500).json({ message: "Could not load platform notices." });
  }
};

exports.listForAdmin = async (req, res) => {
  try {
    const notices = await PlatformNotice.find({})
      .populate("createdBy", "email")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ notices });
  } catch (error) {
    console.error("Admin platform notices load failed:", error);
    return res.status(500).json({ message: "Could not load platform notices." });
  }
};

exports.create = async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const category = req.body?.category || "general";
  const audience = req.body?.audience;
  const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;

  if (!title || title.length > 120)
    return res.status(400).json({ message: "Title is required and must be 120 characters or fewer." });
  if (!message || message.length > 2000)
    return res.status(400).json({ message: "Message is required and must be 2,000 characters or fewer." });
  if (!(["all", "approved"].includes(audience)))
    return res.status(400).json({ message: "Choose approved businesses." });
  if (!["general", "maintenance", "feature", "policy", "reminder"].includes(category))
    return res.status(400).json({ message: "Choose a valid notice category." });
  if (req.body?.expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()))
    return res.status(400).json({ message: "Expiry must be a future date." });

  let notice;
  try {
    notice = await PlatformNotice.create({
      title,
      message,
      category,
      audience: "approved",
      expiresAt,
      createdBy: req.user.userId,
    });
    await AuditLog.create({
      ownerId: null,
      actorId: req.user.userId,
      action: "CREATE",
      entityType: "Platform Notice",
      entityId: notice._id,
      scope: "platform",
      details: `Published ${category} notice “${title}” to ${audience === "approved" ? "approved businesses" : "all businesses"}${expiresAt ? `; expires ${expiresAt.toISOString()}` : "; no expiry"}.`,
    });
    const populated = await PlatformNotice.findById(notice._id)
      .populate("createdBy", "email")
      .lean();
    return res.status(201).json({ message: "Platform notice published.", notice: populated });
  } catch (error) {
    if (notice) await PlatformNotice.deleteOne({ _id: notice._id }).catch(() => {});
    console.error("Platform notice create failed:", error);
    return res.status(500).json({ message: "Could not publish the platform notice." });
  }
};

exports.update = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ message: "Platform notice ID is invalid." });
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const category = req.body?.category;
  if (!title || title.length > 120)
    return res.status(400).json({ message: "Title is required and must be 120 characters or fewer." });
  if (!message || message.length > 2000)
    return res.status(400).json({ message: "Message is required and must be 2,000 characters or fewer." });
  if (!["general", "maintenance", "feature", "policy", "reminder"].includes(category))
    return res.status(400).json({ message: "Choose a valid notice category." });
  try {
    const notice = await PlatformNotice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: "Platform notice not found." });
    notice.title = title;
    notice.message = message;
    notice.category = category;
    notice.audience = "approved";
    notice.expiresAt = null;
    notice.dismissedBy = [];
    await notice.save();
    await AuditLog.create({
      ownerId: null,
      actorId: req.user.userId,
      action: "UPDATE",
      entityType: "Platform Notice",
      entityId: notice._id,
      scope: "platform",
      details: `Updated platform notice “${title}”. Prior dismissals were cleared.`,
    });
    const populated = await PlatformNotice.findById(notice._id).populate("createdBy", "email").lean();
    return res.json({ message: "Platform notice updated and shown again to approved accounts.", notice: populated });
  } catch (error) {
    console.error("Platform notice update failed:", error);
    return res.status(500).json({ message: "Could not update the platform notice." });
  }
};

exports.remove = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ message: "Platform notice ID is invalid." });
  try {
    const notice = await PlatformNotice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: "Platform notice not found." });
    await AuditLog.create({
      ownerId: null,
      actorId: req.user.userId,
      action: "DELETE",
      entityType: "Platform Notice",
      entityId: notice._id,
      scope: "platform",
      details: `Removed platform notice “${notice.title}”.`,
    });
    await notice.deleteOne();
    return res.json({ message: "Platform notice removed." });
  } catch (error) {
    console.error("Platform notice delete failed:", error);
    return res.status(500).json({ message: "Could not remove the platform notice." });
  }
};

exports.dismiss = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ message: "Platform notice ID is invalid." });
  try {
    const viewer = await User.findOne({ _id: req.user.userId, role: { $in: ["Owner", "Staff", "masterStaff"] }, accountStatus: "Active" }).select("_id role ownerId").lean();
    const owner = viewer?.role === "Owner" ? viewer : viewer?.ownerId ? await User.findOne({ _id: viewer.ownerId, role: "Owner", accountStatus: "Active" }).select("_id").lean() : null;
    if (!viewer || !owner) return res.status(403).json({ message: "Only approved business accounts can dismiss platform notices." });
    const result = await PlatformNotice.updateOne(
      { _id: req.params.id, audience: "approved" },
      { $addToSet: { dismissedBy: viewer._id } },
    );
    if (!result.matchedCount) return res.status(404).json({ message: "Platform notice not found." });
    return res.json({ message: "Notice hidden for your account." });
  } catch (error) {
    console.error("Platform notice dismissal failed:", error);
    return res.status(500).json({ message: "Could not hide the platform notice." });
  }
};
