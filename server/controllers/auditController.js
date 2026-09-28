const AuditLog = require("../models/AuditLog");
const getOwnerId = require("../utils/ownerScope");

exports.listAuditLogs = async (req, res) => {
  if (req.user.role !== "Owner") {
    return res
      .status(403)
      .json({ message: "Only owners can view audit logs." });
  }

  try {
    const ownerId = await getOwnerId(req);

    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100,
    );

    const skip = (page - 1) * limit;

    const filter = { ownerId };

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate(
          "actorId",
          "ownerName staffName staffPosition role email",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Owner audit logs error:", error);

    return res.status(500).json({
      message: "Failed to load audit logs.",
    });
  }
};