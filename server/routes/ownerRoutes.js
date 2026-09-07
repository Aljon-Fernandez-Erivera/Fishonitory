const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const ownerController = require("../controllers/ownerController");
const {
  validateAccountStatus,
  validateId,
  validateStaff,
  validateStaffOtp,
  validateStaffUpdate,
  validateAttendanceStatus,
} = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
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
router.delete("/staff/:id", validateId("id"), ownerController.deleteStaff);

module.exports = router;
