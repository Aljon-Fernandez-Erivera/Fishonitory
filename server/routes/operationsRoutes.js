const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const purchaseController = require("../controllers/purchaseController");
const mortalityController = require("../controllers/mortalityController");
const auditController = require("../controllers/auditController");
const { validateMortality, validatePurchase } = require("../middleware/validateOperations");

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole(["Owner", "masterStaff"]));
router.get("/purchases", purchaseController.listPurchases);
router.post("/purchases", validatePurchase, purchaseController.createPurchase);
router.get("/mortality", mortalityController.listMortality);
router.post("/mortality", validateMortality, mortalityController.createMortality);
router.get("/audit-logs", auditController.listAuditLogs);

module.exports = router;
