const AuditLog = require("../models/AuditLog");
const getOwnerId = require("../utils/ownerScope");

exports.listAuditLogs = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can view audit logs." });
  const ownerId = await getOwnerId(req);
  const logs = await AuditLog.find({ ownerId })
    .populate("actorId", "ownerName staffName staffPosition role")
    .sort({ createdAt: -1 })
    .limit(500);
  return res.json({ logs });
};
