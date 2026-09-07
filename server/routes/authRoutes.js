const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validateRegistration = require("../middleware/validateRegistration");
const authMiddleware = require("../middleware/authMiddleware");

// Step 1: Send OTP
router.post("/send-otp", validateRegistration, authController.sendOtp);

// Step 2: Verify OTP and Register
router.post(
  "/verify-and-register",
  validateRegistration,
  authController.verifyAndRegister,
);

// Step 3: Login
router.post("/login", validateRegistration, authController.login);
router.post("/logout", authController.logout);
router.get("/session", authMiddleware, authController.getSession);

// Get the authenticated user's profile without exposing password or OTP
router.get("/me", authMiddleware, authController.getCurrentUser);

// MUST BE EXPORTED EXACTLY LIKE THIS:
module.exports = router;
