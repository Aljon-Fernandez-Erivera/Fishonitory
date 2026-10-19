const express = require("express");
const rateLimit = require("express-rate-limit");
const attendanceController = require("../controllers/attendanceController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const {
  validateAttendanceStatus,
  validateId,
  validateStaffAttendance,
} = require("../middleware/requestValidators");

const router = express.Router();
const staffTimeClockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many time-clock attempts. Try again later." },
});

// The staff time clock is a credential-authenticated kiosk endpoint. Keep it
// before the session middleware so staff can verify their own credentials
// without an already-authenticated browser session.
router.post("/staff-time-clock", staffTimeClockLimiter, attendanceController.staffTimeClock);

router.use(authMiddleware);
router.use(requireRole(["Owner", "masterStaff", "Staff"]));

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
