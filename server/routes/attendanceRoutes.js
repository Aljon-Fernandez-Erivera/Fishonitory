const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const {
  validateAttendanceStatus,
  validateId,
  validateStaffAttendance,
} = require("../middleware/requestValidators");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(["Owner", "masterStaff", "Staff"]));

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

router.get("/shift-assignments", authMiddleware, attendanceController.listShiftAssignments);
router.post("/shift-assignments", authMiddleware, attendanceController.saveShiftAssignment);
router.delete(
  "/shift-assignments/:id",
  authMiddleware,
  validateId("id"),
  attendanceController.deleteShiftAssignment,
);

module.exports = router;
