const jwt = require("jsonwebtoken");
const config = require("../config/config");

function getCookieToken(cookieHeader) {
  const tokenCookie = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("access_token="));

  return tokenCookie ? decodeURIComponent(tokenCookie.slice(13)) : null;
}

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;
  const token =
    authorization && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : getCookieToken(req.headers.cookie);

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication token is required." });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired authentication token." });
  }
};

module.exports = authMiddleware;
