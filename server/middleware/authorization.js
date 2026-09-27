const jwt = require("jsonwebtoken");
const config = require("../config/config");

const cookieNameForRole = (role) => {
  if (role === "Owner") return "owner_access_token";
  if (role === "Staff") return "staff_access_token";
  if (role === "masterStaff") return "master_staff_access_token";
  if (role === "superAdmin") return "super_admin_access_token";
  return null;
};

const getCookieToken = (cookieHeader, cookieName = "access_token") => {
  const tokenCookie = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${cookieName}=`));

  return tokenCookie
    ? decodeURIComponent(tokenCookie.slice(cookieName.length + 1))
    : null;
};

// Enforce role-based access control for sensitive routes. This is the actual
// security check that prevents a user from reaching a dashboard they are not allowed to use.
const requireRole = (allowedRoles = []) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: "You do not have permission to access this resource.",
    });
  }

  return next();
};

module.exports = {
  cookieNameForRole,
  getCookieToken,
  requireRole,
  verifyRoleAccess: requireRole,
};