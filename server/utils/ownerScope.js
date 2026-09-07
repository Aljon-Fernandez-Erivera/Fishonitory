const User = require("../models/User");

async function getOwnerId(req) {
  if (req.user.role === "Owner") return req.user.userId;
  const staff = await User.findById(req.user.userId).select("ownerId");
  return staff?.ownerId;
}

module.exports = getOwnerId;
