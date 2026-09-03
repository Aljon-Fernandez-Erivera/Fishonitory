const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/check-in', authMiddleware, attendanceController.recordStaffAttendance);
router.get('/', authMiddleware, attendanceController.listAttendance);
router.patch('/:id/status', authMiddleware, attendanceController.updateAttendanceStatus);
router.post('/status', authMiddleware, attendanceController.setStaffAttendance);
router.delete('/:id', authMiddleware, attendanceController.deleteAttendance);

module.exports = router;
