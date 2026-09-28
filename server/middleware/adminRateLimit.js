const rateLimit = require("express-rate-limit");

const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    message: "Too many admin actions. Please try again later.",
  },
});

module.exports = {
  adminActionLimiter,
};