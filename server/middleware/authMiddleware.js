const jwt = require("jsonwebtoken");
const config = require("../config/config");
const {
  cookieNameForRole,
  getCookieToken,
  requireRole,
} = require("./authorization");

// Validate the JWT before letting any authenticated endpoint proceed. This is the
// first line of defense for every protected API route.
const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;
  const requestedRole = req.headers["x-session-role"];
  const preferredCookieName = cookieNameForRole(requestedRole);
  const fallbackCookieNames = [
    preferredCookieName,
    "owner_access_token",
    "staff_access_token",
    "master_staff_access_token",
    "access_token",
  ].filter(Boolean);

  let token = null;

  // Prefer Authorization headers, then fall back to role-specific cookies. This
  // ensures the app can authenticate correctly across local/dev and deployment setups.
  if (authorization && authorization.startsWith("Bearer ")) {
    token = authorization.slice(7);
  } else {
    for (const cookieName of fallbackCookieNames) {
      const candidate = getCookieToken(req.headers.cookie, cookieName);
      if (candidate) {
        token = candidate;
        break;
      }
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication token is required." });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);

    if (requestedRole && req.user.role !== requestedRole) {
      return res.status(403).json({ message: "This session is not authorized for the requested account type." });
    }

    return next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired authentication token." });
  }
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
module.exports.cookieNameForRole = cookieNameForRole;
