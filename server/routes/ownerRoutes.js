const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const ownerController = require("../controllers/ownerController");
const {
  validateAccountStatus,
  validateDeletionOtp,
  validateId,
  validateStaff,
  validateStaffOtp,
  validateStaffUpdate,
  validateAttendanceStatus,
} = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole(["Owner"]));
router.get("/workspace-settings", ownerController.getWorkspaceSettings);
router.put("/workspace-settings", ownerController.updateWorkspaceSettings);
router.post("/staff/send-otp", validateStaff, ownerController.sendStaffOtp);
router.post("/staff", validateStaffOtp, ownerController.createStaff);
router.get("/staff", ownerController.listStaff);
router.patch(
  "/staff/:id/status",
  validateId("id"),
  validateAccountStatus,
  ownerController.updateStaffStatus,
);
router.patch(
  "/staff/:id",
  validateId("id"),
  validateStaffUpdate,
  ownerController.updateStaff,
);
router.post(
  "/staff/:id/deletion-otp",
  validateId("id"),
  ownerController.sendStaffDeletionOtp,
);
router.delete(
  "/staff/:id",
  validateId("id"),
  validateDeletionOtp,
  ownerController.deleteStaff,
);

module.exports = router;
