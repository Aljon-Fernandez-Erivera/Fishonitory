const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const {
  adminActionLimiter,
} = require("../middleware/adminRateLimit");

// Every route here is Super Admin only. authMiddleware validates the JWT;
// requireRole enforces that the token's role is actually superAdmin, so even
// a stolen Owner/Staff token can never reach these endpoints.
router.use(authMiddleware, requireRole(["superAdmin"]));

router.get("/overview", adminController.getOverviewStats);
router.get("/owners/pending", adminController.listPendingOwners);
router.post("/owners/:id/approve", adminController.approveOwner);
router.post("/owners/:id/reject", adminController.rejectOwner);

router.get("/accounts", adminController.listAllAccounts);
router.patch("/accounts/:id/status", adminController.setAccountStatus);

router.get("/logs", adminController.listSystemLogs);

router.get(
  "/analytics/registrations",
  adminController.getRegistrationAnalytics
);

router.get(
  "/analytics/verification",
  adminController.getVerificationAnalytics
);

router.get(
  "/data-health",
  adminController.getDataHealth
);

router.get(
  "/system-health",
  adminController.getSystemHealth
);

router.post(
  "/owners/:id/approve",
  adminActionLimiter,
  adminController.approveOwner,
);

router.post(
  "/owners/:id/reject",
  adminActionLimiter,
  adminController.rejectOwner,
);

module.exports = router;