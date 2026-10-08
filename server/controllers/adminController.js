const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { writeAudit } = require("../utils/audit");
const mongoose = require("mongoose");
const { checkDisplayName, checkPhone } = require("../utils/validators");
const {
  sendApprovalEmail,
  sendRejectionEmail,
} = require("../utils/mailer");

// Every business owner currently waiting on a permit review, oldest first so
// the queue is worked in the order it came in.
exports.listPendingOwners = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100,
    );

    const filter = {
      role: "Owner",
      accountStatus: "Pending Verification",
    };

    const skip = (page - 1) * limit;

    const [pending, total] = await Promise.all([
      User.find(filter)
        .select(
          "businessName ownerName email businessAddress businessLatitude businessLongitude phoneNumber businessPermitUrl createdAt",
        )
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      pending,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Pending owners error:", error);

    return res.status(500).json({
      message: "Failed to load pending verifications.",
    });
  }
};

exports.listAllAccounts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100,
    );

    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "").trim();

    const filter = {
      role: { $in: ["Owner", "Staff", "masterStaff"] },
    };

    // Role filter
    if (["Owner", "Staff", "masterStaff"].includes(role)) {
      filter.role = role;
    } else if (!search) {
      filter.role = "Owner";
    }

    // Search across relevant account fields
    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      const regex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { businessName: regex },
        { ownerName: regex },
        { staffName: regex },
        { email: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      User.find(filter)
        .select(
          "businessName ownerName staffName staffPosition email role accountStatus ownerId createdAt verifiedAt rejectionReason",
        )
        // Staff rows show which business they belong to.
        .populate("ownerId", "businessName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    // How many staff accounts each Owner on this page has (for the tree view).
    const ownerIds = accounts
      .filter((account) => account.role === "Owner")
      .map((account) => account._id);
    const staffCountRows = ownerIds.length
      ? await User.aggregate([
          {
            $match: {
              role: { $in: ["Staff", "masterStaff"] },
              ownerId: { $in: ownerIds },
            },
          },
          { $group: { _id: "$ownerId", count: { $sum: 1 } } },
        ])
      : [];
    const staffCountByOwner = new Map(
      staffCountRows.map((row) => [String(row._id), row.count]),
    );
    const accountsWithCounts = accounts.map((account) =>
      account.role === "Owner"
        ? { ...account, staffCount: staffCountByOwner.get(String(account._id)) || 0 }
        : account,
    );

    const totalPages = Math.ceil(total / limit);

    return res.json({
      accounts: accountsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("List accounts error:", error);

    return res.status(500).json({
      message: "Failed to load accounts.",
    });
  }
};

// High-level counts for the Super Admin overview page.
exports.getOverviewStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOwners,
      pendingOwners,
      activeOwners,
      rejectedOwners,
      disabledAccounts,
      businessesThisMonth,
      oldestPending,
    ] = await Promise.all([
      User.countDocuments({ role: "Owner" }),
      User.countDocuments({ role: "Owner", accountStatus: "Pending Verification" }),
      User.countDocuments({ role: "Owner", accountStatus: "Active" }),
      User.countDocuments({ role: "Owner", accountStatus: "Rejected" }),
      User.countDocuments({ accountStatus: "Disabled" }),
      User.countDocuments({ role: "Owner", createdAt: { $gte: startOfMonth } }),
      User.findOne({ role: "Owner", accountStatus: "Pending Verification" })
        .sort({ createdAt: 1 })
        .select("createdAt")
        .lean(),
    ]);

    // Businesses that have already gone through a decision.
    const reviewedOwners = activeOwners + rejectedOwners;
    const pct = (part, whole) =>
      whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : 0;

    return res.json({
      // Kept with the same names so existing code keeps working.
      totalOwners,
      pendingOwners,
      activeOwners,
      rejectedOwners,
      disabledAccounts,
      businessesThisMonth,

      // New / clearer fields for the overview cards.
      registeredOwners: totalOwners,
      approvedOwners: activeOwners,
      reviewedOwners,
      oldestPendingAt: oldestPending?.createdAt || null,

      approvalRate: pct(activeOwners, reviewedOwners),
      rejectionRate: pct(rejectedOwners, reviewedOwners),
      activeRate: pct(activeOwners, totalOwners),
    });
  } catch (error) {
    console.error("Overview stats error:", error);
    return res.status(500).json({ message: "Failed to load overview stats." });
  }
};

// Approve a pending owner: the account becomes Active and can log in.
// An approval email is sent afterwards; if that email fails the approval
// still stands and the response says so.
exports.approveOwner = async (req, res) => {
  try {
    const owner = await User.findOne({
      _id: req.params.id,
      role: "Owner",
      accountStatus: "Pending Verification",
    });

    if (!owner) {
      return res.status(409).json({
        message: "This account is no longer pending verification.",
      });
    }

    owner.accountStatus = "Active";
    owner.verifiedBy = req.user.userId;
    owner.verifiedAt = new Date();
    owner.rejectedAt = null;
    owner.rejectionReason = "";

    await owner.save({ validateBeforeSave: false });

    await writeAudit(
      req,
      "APPROVE",
      "User",
      owner._id,
      `Approved business registration for ${owner.businessName}`,
    );

    const { error: mailError } = await sendApprovalEmail(owner);
    if (mailError) {
      console.error("Approval email failed:", owner.email, mailError);
    }

    return res.json({
      message: mailError
        ? `${owner.businessName} has been approved, but the notification email could not be sent.`
        : `${owner.businessName} has been approved and notified by email.`,
      emailSent: !mailError,
    });
  } catch (error) {
    console.error("Approve owner error:", error);
    return res.status(500).json({ message: "Failed to approve this account." });
  }
};

// Reject a pending owner with a reason. The reason is saved, shown if they
// try to log in, and emailed to them.
exports.rejectOwner = async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim().slice(0, 500);

    if (!reason) {
      return res.status(400).json({ message: "A rejection reason is required." });
    }

    const owner = await User.findOne({
      _id: req.params.id,
      role: "Owner",
      accountStatus: "Pending Verification",
    });

    if (!owner) {
      return res.status(409).json({
        message: "This account is no longer pending verification.",
      });
    }

    owner.accountStatus = "Rejected";
    owner.verifiedBy = null;
    owner.verifiedAt = null;
    owner.rejectedAt = new Date();
    owner.rejectionReason = reason;

    await owner.save({ validateBeforeSave: false });

    await writeAudit(
      req,
      "REJECT",
      "User",
      owner._id,
      `Rejected business registration for ${owner.businessName}: ${reason}`,
    );

    const { error: mailError } = await sendRejectionEmail(owner, reason);
    if (mailError) {
      console.error("Rejection email failed:", owner.email, mailError);
    }

    return res.json({
      message: mailError
        ? `${owner.businessName}'s registration has been rejected, but the notification email could not be sent.`
        : `${owner.businessName}'s registration has been rejected and the owner was notified by email.`,
      emailSent: !mailError,
    });
  } catch (error) {
    console.error("Reject owner error:", error);
    return res.status(500).json({ message: "Failed to reject this account." });
  }
};

// Enable or disable any Owner/Staff account platform-wide. Distinct from
// approve/reject, which only applies to first-time Pending Verification.
exports.setAccountStatus = async (req, res) => {
  const { status } = req.body;

  if (!["Active", "Disabled"].includes(status)) {
    return res.status(400).json({
      message: "Status must be Active or Disabled.",
    });
  }

  const account = await User.findOne({
    _id: req.params.id,
    role: { $in: ["Owner", "Staff", "masterStaff"] },
  });

  if (!account) {
    return res.status(404).json({
      message: "Account not found.",
    });
  }

  if (
    ["Pending Verification", "Rejected"].includes(
      account.accountStatus,
    )
  ) {
    return res.status(400).json({
      message:
        "This account has not been through registration review yet. Approve or reject it first.",
    });
  }

  account.accountStatus = status;

  await account.save({
    validateBeforeSave: false,
  });

  await writeAudit(
    req,
    status === "Disabled" ? "DISABLE" : "ENABLE",
    "User",
    account._id,
    `Super Admin set account status to ${status} for ${account.email}`,
  );

  return res.json({
    message: `Account status updated to ${status}.`,
    account,
  });
};

// Platform-wide audit log — every business, not scoped to one ownerId like
// the per-business audit trail Owners see in their own dashboard.
// Uses server-side pagination so the Super Admin does not have to load
// hundreds/thousands of audit records at once.
exports.listSystemLogs = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100,
    );

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({})
        .populate(
          "actorId",
          "email role businessName staffName",
        )
        .populate("ownerId", "businessName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      AuditLog.countDocuments({}),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      logs,

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("System logs error:", error);

    return res.status(500).json({
      message: "Failed to load system logs.",
    });
  }
};

// Registration trend for the Super Admin analytics dashboard.
// Returns the last 6 calendar months using Manila time.
exports.getRegistrationAnalytics = async (req, res) => {
  try {
    const now = new Date();

    // Get the current month in Asia/Manila.
    const manilaParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);

    const year = Number(
      manilaParts.find((part) => part.type === "year").value,
    );

    const month = Number(
      manilaParts.find((part) => part.type === "month").value,
    );

    // Build the first day of the month, 5 months ago.
    const startMonthIndex = month - 1 - 5;

    const startYear =
      year + Math.floor(startMonthIndex / 12);

    const normalizedMonth =
      ((startMonthIndex % 12) + 12) % 12;

    const startDate = new Date(
      Date.UTC(
        startYear,
        normalizedMonth,
        1,
        -8,
        0,
        0,
      ),
    );

    const results = await User.aggregate([
      {
        $match: {
          role: "Owner",
          createdAt: { $gte: startDate },
        },
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone: "Asia/Manila",
            },
          },

          registered: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    // Create all 6 months so months with zero registrations
    // still appear in the analytics.
    const months = [];

    for (let i = 0; i < 6; i++) {
      const monthIndex = normalizedMonth + i;

      const monthDate = new Date(
        Date.UTC(
          startYear + Math.floor(monthIndex / 12),
          monthIndex % 12,
          1,
        ),
      );

      const key = `${monthDate.getUTCFullYear()}-${String(
        monthDate.getUTCMonth() + 1,
      ).padStart(2, "0")}`;

      months.push(key);
    }

    const resultMap = new Map(
      results.map((item) => [
        item._id,
        item.registered,
      ]),
    );

    const analytics = months.map((key) => {
      const [y, m] = key.split("-");

      const date = new Date(
        Date.UTC(
          Number(y),
          Number(m) - 1,
          1,
        ),
      );

      return {
        month: key,

        label: date.toLocaleDateString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),

        registered: resultMap.get(key) || 0,
      };
    });

    return res.json({
      period: "last_6_months",
      analytics,
    });
  } catch (error) {
    console.error(
      "Registration analytics error:",
      error,
    );

    return res.status(500).json({
      message: "Failed to load registration analytics.",
    });
  }
};

// Verification performance metrics.
// Measures how long approved business registrations took to be verified.
exports.getVerificationAnalytics = async (req, res) => {
  try {
    const result = await User.aggregate([
      {
        $match: {
          role: "Owner",
          accountStatus: "Active",
          createdAt: { $exists: true },
          verifiedAt: {
            $exists: true,
            $ne: null,
          },
        },
      },

      {
        $project: {
          processingTimeMs: {
            $subtract: [
              "$verifiedAt",
              "$createdAt",
            ],
          },
        },
      },

      {
        $match: {
          processingTimeMs: {
            $gte: 0,
          },
        },
      },

      {
        $group: {
          _id: null,

          approvedCount: {
            $sum: 1,
          },

          averageProcessingTimeMs: {
            $avg: "$processingTimeMs",
          },

          fastestProcessingTimeMs: {
            $min: "$processingTimeMs",
          },

          slowestProcessingTimeMs: {
            $max: "$processingTimeMs",
          },
        },
      },
    ]);

    const data = result[0];

    if (!data) {
      return res.json({
        approvedCount: 0,
        averageApprovalTimeHours: 0,
        averageApprovalTimeDays: 0,
        fastestApprovalTimeHours: 0,
        slowestApprovalTimeHours: 0,
      });
    }

    const msToHours = (ms) =>
      ms / (1000 * 60 * 60);

    const averageHours = msToHours(
      data.averageProcessingTimeMs,
    );

    const fastestHours = msToHours(
      data.fastestProcessingTimeMs,
    );

    const slowestHours = msToHours(
      data.slowestProcessingTimeMs,
    );

    return res.json({
      approvedCount: data.approvedCount,

      averageApprovalTimeHours: Number(
        averageHours.toFixed(1),
      ),

      averageApprovalTimeDays: Number(
        (averageHours / 24).toFixed(1),
      ),

      fastestApprovalTimeHours: Number(
        fastestHours.toFixed(1),
      ),

      slowestApprovalTimeHours: Number(
        slowestHours.toFixed(1),
      ),
    });
  } catch (error) {
    console.error(
      "Verification analytics error:",
      error,
    );

    return res.status(500).json({
      message: "Failed to load verification analytics.",
    });
  }
};

// Platform-wide data quality checks.
// Read-only: this endpoint does not modify any records.
exports.getDataHealth = async (req, res) => {
  try {
    const ownerFilter = {
      role: "Owner",
    };

    const staffFilter = {
      role: {
        $in: ["Staff", "masterStaff"],
      },
    };

    const accountFilter = {
      role: {
        $in: ["Owner", "Staff", "masterStaff"],
      },
    };

    const [
      totalAccounts,
      totalOwners,
      totalStaff,

      ownersMissingBusinessName,
      ownersMissingEmail,
      ownersMissingAddress,
      ownersMissingPermit,

      staffMissingOwner,
      accountsMissingCreatedAt,
    ] = await Promise.all([
      User.countDocuments(accountFilter),

      User.countDocuments(ownerFilter),

      User.countDocuments(staffFilter),

      User.countDocuments({
        ...ownerFilter,

        $or: [
          { businessName: { $exists: false } },
          { businessName: null },
          { businessName: "" },
        ],
      }),

      User.countDocuments({
        ...ownerFilter,

        $or: [
          { email: { $exists: false } },
          { email: null },
          { email: "" },
        ],
      }),

      User.countDocuments({
        ...ownerFilter,

        $or: [
          { businessAddress: { $exists: false } },
          { businessAddress: null },
          { businessAddress: "" },
        ],
      }),

      User.countDocuments({
        ...ownerFilter,

        $or: [
          {
            businessPermitUrl: {
              $exists: false,
            },
          },
          { businessPermitUrl: null },
          { businessPermitUrl: "" },
        ],
      }),

      User.countDocuments({
        ...staffFilter,

        $or: [
          {
            ownerId: {
              $exists: false,
            },
          },
          { ownerId: null },
        ],
      }),

      User.countDocuments({
        ...accountFilter,

        $or: [
          {
            createdAt: {
              $exists: false,
            },
          },
          { createdAt: null },
        ],
      }),
    ]);

    const issues = {
      ownersMissingBusinessName,
      ownersMissingEmail,
      ownersMissingAddress,
      ownersMissingPermit,
      staffMissingOwner,
      accountsMissingCreatedAt,
    };

    const totalIssues = Object.values(
      issues,
    ).reduce(
      (sum, value) => sum + value,
      0,
    );

    const completenessRate = (
      missing,
      total,
    ) =>
      total > 0
        ? Number(
            (
              ((total - missing) /
                total) *
              100
            ).toFixed(1),
          )
        : 100;

    const completeness = {
      businessName: completenessRate(
        ownersMissingBusinessName,
        totalOwners,
      ),

      email: completenessRate(
        ownersMissingEmail,
        totalOwners,
      ),

      address: completenessRate(
        ownersMissingAddress,
        totalOwners,
      ),

      businessPermit: completenessRate(
        ownersMissingPermit,
        totalOwners,
      ),

      staffOwnerLink: completenessRate(
        staffMissingOwner,
        totalStaff,
      ),

      createdAt: completenessRate(
        accountsMissingCreatedAt,
        totalAccounts,
      ),
    };

    // Kept for compatibility with the current frontend.
    // Field-level completeness above should be preferred for analysis.
    const dataQualityRate =
      totalAccounts > 0
        ? Number(
            Math.max(
              0,
              (
                (totalAccounts -
                  totalIssues) /
                totalAccounts
              ) *
                100,
            ).toFixed(1),
          )
        : 100;

    return res.json({
      totalAccounts,
      totalOwners,
      totalStaff,
      totalIssues,

      dataQualityRate,

      completeness,

      issues,
    });
  } catch (error) {
    console.error(
      "Data health error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to load data health information.",
    });
  }
};

exports.getSystemHealth = async (req, res) => {
  try {
    const dbReadyState =
      require("mongoose").connection
        .readyState;

    const databaseStatus =
      dbReadyState === 1
        ? "Connected"
        : dbReadyState === 2
          ? "Connecting"
          : dbReadyState === 3
            ? "Disconnecting"
            : "Disconnected";

    return res.json({
      api: {
        status: "Operational",
      },

      database: {
        status: databaseStatus,
        readyState: dbReadyState,
      },

      server: {
        uptimeSeconds: Math.floor(
          process.uptime(),
        ),

        nodeVersion: process.version,

        environment:
          process.env.NODE_ENV ||
          "development",

        timestamp:
          new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "System health error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to retrieve system health.",
    });
  }
};

// Approved (Active) businesses, each with a count of its registered staff.
exports.listActiveBusinesses = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search = String(req.query.search || "").trim();

    const filter = { role: "Owner", accountStatus: "Active" };

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ businessName: regex }, { ownerName: regex }, { email: regex }];
    }

    const [owners, total] = await Promise.all([
      User.find(filter)
        .select("businessName ownerName email businessAddress createdAt verifiedAt")
        .sort({ businessName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const staffCounts = await User.aggregate([
      {
        $match: {
          role: { $in: ["Staff", "masterStaff"] },
          ownerId: { $in: owners.map((owner) => owner._id) },
        },
      },
      { $group: { _id: "$ownerId", count: { $sum: 1 } } },
    ]);
    const countByOwner = new Map(
      staffCounts.map((row) => [String(row._id), row.count]),
    );

    return res.json({
      businesses: owners.map((owner) => ({
        ...owner,
        staffCount: countByOwner.get(String(owner._id)) || 0,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List active businesses error:", error);
    return res.status(500).json({ message: "Failed to load businesses." });
  }
};

// Registered staff of one business (read-only for the Super Admin).
exports.listBusinessStaff = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid business id." });
    }

    const owner = await User.findOne({ _id: req.params.id, role: "Owner" })
      .select("businessName")
      .lean();

    if (!owner) {
      return res.status(404).json({ message: "Business not found." });
    }

    const staff = await User.find({
      ownerId: owner._id,
      role: { $in: ["Staff", "masterStaff"] },
    })
      .select("staffName staffPosition email role accountStatus createdAt")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ businessName: owner.businessName, staff });
  } catch (error) {
    console.error("List business staff error:", error);
    return res.status(500).json({ message: "Failed to load staff." });
  }
};

// ---------------------------------------------------------------------
// Super Admin own profile (display name + contact phone).
// Email is the login identity and the place codes are sent, so it is not
// editable here.
// ---------------------------------------------------------------------
const profileView = (user) => ({
  email: user.email,
  displayName: user.displayName || "",
  phoneNumber: user.phoneNumber || "",
});

exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "email displayName phoneNumber accountStatus",
    );
    if (!user || user.accountStatus !== "Active") {
      return res.status(401).json({ message: "Session is no longer valid." });
    }
    return res.json({ profile: profileView(user) });
  } catch (error) {
    console.error("Get admin profile failed:", error.message);
    return res.status(500).json({ message: "Could not load your profile." });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    const name = checkDisplayName(body.displayName);
    if (name.error) return res.status(400).json({ message: name.error });

    const phone = checkPhone(body.phoneNumber);
    if (phone.error) return res.status(400).json({ message: phone.error });

    const user = await User.findById(req.user.userId);
    if (!user || user.accountStatus !== "Active") {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    user.displayName = name.value;
    user.phoneNumber = phone.value;
    await user.save({ validateBeforeSave: false });

    try {
      await writeAudit(req, "UPDATE", "User", user._id, "Admin profile updated.");
    } catch (auditError) {
      console.error("Profile audit failed:", auditError.message);
    }

    return res.json({
      message: "Profile updated.",
      profile: profileView(user),
    });
  } catch (error) {
    console.error("Update admin profile failed:", error.message);
    return res.status(500).json({ message: "Could not save your profile." });
  }
};