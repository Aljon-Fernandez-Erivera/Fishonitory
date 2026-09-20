const jwt = require("jsonwebtoken");
const config = require("../config/config");

const cookieNameForRole = (role) => {
  if (role === "Owner") return "owner_access_token";
  if (role === "Staff") return "staff_access_token";
  if (role === "masterStaff") return "master_staff_access_token";
  return null;
};

function getCookieToken(cookieHeader, cookieName = "access_token") {
  const tokenCookie = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${cookieName}=`));

  return tokenCookie
    ? decodeURIComponent(tokenCookie.slice(cookieName.length + 1))
    : null;
}

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;
  const requestedRole = req.headers["x-session-role"];
  const cookieName = cookieNameForRole(requestedRole);
  const token =
    authorization && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : getCookieToken(req.headers.cookie, cookieName || "access_token");

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
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired authentication token." });
  }
};

module.exports = authMiddleware;
module.exports.cookieNameForRole = cookieNameForRole;
