const AuditLog = require("../models/AuditLog");
const getOwnerId = require("./ownerScope");

async function writeAudit(req, action, entityType, entityId, details = "") {
  const ownerId = await getOwnerId(req);
  if (!ownerId) return;
  try {
    await AuditLog.create({
      ownerId,
      actorId: req.user.userId,
      action,
      entityType,
      entityId: entityId || null,
      details,
    });
  } catch (error) {
    // Audit failure must not undo a successful business transaction.
    console.error("Audit log write failed:", error.message);
  }
}

module.exports = { writeAudit };
