const rateLimit = require("express-rate-limit");

const createLimiter = (limit, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message },
});

module.exports = {
  loginLimiter: createLimiter(30, "Too many sign-in attempts. Please try again later."),
  registrationOtpSendLimiter: createLimiter(5, "Too many verification code requests. Please try again later."),
  registrationOtpVerifyLimiter: createLimiter(10, "Too many verification attempts. Please request a new code later."),
  passwordResetRequestLimiter: createLimiter(5, "Too many reset code requests. Please try again later."),
  passwordResetConfirmLimiter: createLimiter(10, "Too many reset attempts. Please request a new code later."),
  totpLoginLimiter: createLimiter(20, "Too many authenticator attempts. Please try again later."),
  totpResetStartLimiter: createLimiter(3, "Too many authenticator reset requests. Please try again later."),
  totpResetConfirmLimiter: createLimiter(10, "Too many authenticator reset attempts. Please try again later."),
};
