const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { writeAudit } = require("../utils/audit");

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
          "businessName ownerName email businessAddress phoneNumber businessPermitUrl createdAt",
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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      accounts,
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
  const now = new Date();

  // Start of the current month.
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const [
    totalOwners,
    pendingOwners,
    activeOwners,
    rejectedOwners,
    totalStaff,
    disabledAccounts,

    // Businesses/staff registered during the current month.
    businessesThisMonth,
    staffThisMonth,
  ] = await Promise.all([
    User.countDocuments({ role: "Owner" }),

    User.countDocuments({
      role: "Owner",
      accountStatus: "Pending Verification",
    }),

    User.countDocuments({
      role: "Owner",
      accountStatus: "Active",
    }),

    User.countDocuments({
      role: "Owner",
      accountStatus: "Rejected",
    }),

    User.countDocuments({
      role: { $in: ["Staff", "masterStaff"] },
    }),

    User.countDocuments({
      accountStatus: "Disabled",
    }),

    User.countDocuments({
      role: "Owner",
      createdAt: { $gte: startOfMonth },
    }),

    User.countDocuments({
      role: { $in: ["Staff", "masterStaff"] },
      createdAt: { $gte: startOfMonth },
    }),
  ]);

  // Businesses that have already gone through a decision.
  const reviewedOwners = activeOwners + rejectedOwners;

  const approvalRate =
    reviewedOwners > 0
      ? Number(((activeOwners / reviewedOwners) * 100).toFixed(1))
      : 0;

  const rejectionRate =
    reviewedOwners > 0
      ? Number(((rejectedOwners / reviewedOwners) * 100).toFixed(1))
      : 0;

  const activeRate =
    totalOwners > 0
      ? Number(((activeOwners / totalOwners) * 100).toFixed(1))
      : 0;

  const averageStaffPerBusiness =
    totalOwners > 0
      ? Number((totalStaff / totalOwners).toFixed(1))
      : 0;

  return res.json({
    totalOwners,
    pendingOwners,
    activeOwners,
    rejectedOwners,
    totalStaff,
    disabledAccounts,

    approvalRate,
    rejectionRate,
    activeRate,
    averageStaffPerBusiness,

    businessesThisMonth,
    staffThisMonth,
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
    return res.status(409).json({
      message: "This account is no longer pending verification.",
    });
  }

  owner.accountStatus = "Active";
  owner.verifiedBy = req.user.userId;
  owner.verifiedAt = new Date();

  // An approved registration should not retain a rejection timestamp/reason.
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

  return res.json({
    message: `${owner.businessName} has been approved and can now log in.`,
  });
};

// Reject a pending owner, with a reason the owner will see on their next
// login attempt. The account stays in the database (not deleted) in case
// the applicant corrects the issue and a resubmission flow is added later.
exports.rejectOwner = async (req, res) => {
  const reason = String(req.body?.reason || "").trim();

  if (!reason) {
    return res.status(400).json({
      message: "A rejection reason is required.",
    });
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

  // Rejection is not verification.
  owner.verifiedBy = null;
  owner.verifiedAt = null;

  // Record the exact time of the rejection.
  owner.rejectedAt = new Date();

  owner.rejectionReason = reason.slice(0, 500);

  await owner.save({ validateBeforeSave: false });

  await writeAudit(
    req,
    "REJECT",
    "User",
    owner._id,
    `Rejected business registration for ${owner.businessName}: ${reason}`,
  );

  return res.json({
    message: `${owner.businessName}'s registration has been rejected.`,
  });
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