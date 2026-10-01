const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validateRegistration = require("../middleware/validateRegistration");
const authMiddleware = require("../middleware/authMiddleware");
const {
  uploadBusinessPermit,
  uploadErrorHandler,
} = require("../middleware/uploadPermit");

// Step 1: Send OTP
router.post("/send-otp", validateRegistration, authController.sendOtp);

// Step 2: Verify OTP and Register — now multipart/form-data, since the
// business permit file rides alongside the registration fields. multer runs
// first to parse the fields onto req.body and the file onto req.file, then
// the existing field validation runs exactly as before.
router.post(
  "/verify-and-register",
  uploadBusinessPermit,
  uploadErrorHandler,
  validateRegistration,
  authController.verifyAndRegister,
);

// Step 3: Login
router.post("/login", validateRegistration, authController.login);
router.post("/totp/login", authController.verifyTotpLogin);
router.post("/totp/reset/start", authController.startTotpReset);
router.post("/totp/reset/confirm", authController.confirmTotpReset);
router.post("/totp/enroll/start", authController.startRequiredTotpEnrollment);
router.post(
  "/totp/enroll/confirm",
  authController.confirmRequiredTotpEnrollment,
);
router.post(
  "/password-reset/request",
  validateRegistration,
  authController.requestPasswordReset,
);
router.post(
  "/password-reset/confirm",
  validateRegistration,
  authController.resetPassword,
);
router.post("/logout", authController.logout);
router.get("/session", authMiddleware, authController.getSession);
router.get("/totp/status", authMiddleware, authController.getTotpStatus);
router.post("/totp/setup", authMiddleware, authController.startTotpSetup);
router.post(
  "/totp/setup/cancel",
  authMiddleware,
  authController.cancelTotpSetup,
);
router.post("/totp/confirm", authMiddleware, authController.confirmTotpSetup);
router.post("/totp/disable", authMiddleware, authController.disableTotp);

// Get the authenticated user's profile without exposing password or OTP
router.get("/me", authMiddleware, authController.getCurrentUser);

// MUST BE EXPORTED EXACTLY LIKE THIS:
module.exports = router;
