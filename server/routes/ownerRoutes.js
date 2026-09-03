const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ownerController = require('../controllers/ownerController');

const router = express.Router();
router.use(authMiddleware);
router.post('/staff/send-otp', ownerController.sendStaffOtp);
router.post('/staff', ownerController.createStaff);
router.get('/staff', ownerController.listStaff);
router.patch('/staff/:id/status', ownerController.updateStaffStatus);
router.patch('/staff/:id', ownerController.updateStaff);
router.delete('/staff/:id', ownerController.deleteStaff);

module.exports = router;
