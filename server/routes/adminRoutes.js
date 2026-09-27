const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");

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

module.exports = router;