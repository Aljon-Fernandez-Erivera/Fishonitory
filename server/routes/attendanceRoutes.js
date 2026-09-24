const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  validateAttendanceStatus,
  validateId,
  validateStaffAttendance,
} = require("../middleware/requestValidators");

const router = express.Router();

router.post("/staff-time-clock", attendanceController.staffTimeClock);

router.post(
  "/check-in",
  authMiddleware,
  attendanceController.recordStaffAttendance,
);
router.post(
  "/clock-out",
  authMiddleware,
  attendanceController.clockOut,
);
router.get(
  "/today",
  authMiddleware,
  attendanceController.getTodayStatus,
);
router.get("/", authMiddleware, attendanceController.listAttendance);
router.patch(
  "/:id/status",
  authMiddleware,
  validateId("id"),
  validateAttendanceStatus,
  attendanceController.updateAttendanceStatus,
);
router.post(
  "/status",
  authMiddleware,
  validateStaffAttendance,
  attendanceController.setStaffAttendance,
);
router.delete(
  "/:id",
  authMiddleware,
  validateId("id"),
  attendanceController.deleteAttendance,
);
router.get("/shift-templates", authMiddleware, attendanceController.listShiftTemplates);
router.post("/shift-templates", authMiddleware, attendanceController.saveShiftTemplate);
router.delete(
  "/shift-templates/:id",
  authMiddleware,
  validateId("id"),
  attendanceController.deleteShiftTemplate,
);
router.post("/shift-templates/assign", authMiddleware, attendanceController.assignStaffShift);
router.post("/late-deduction", authMiddleware, attendanceController.updateLateDeductionAmount);

module.exports = router;
