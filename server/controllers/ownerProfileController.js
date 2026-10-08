const User = require("../models/User");
const { writeAudit } = require("../utils/audit");
const {
  cleanText,
  checkDisplayName,
  checkPhone,
} = require("../utils/validators");
 
const toCoordinate = (value, min, max) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
};
 
const profileView = (user) => ({
  ownerName: user.ownerName,
  phoneNumber: user.phoneNumber,
  businessAddress: user.businessAddress,
  businessLatitude: user.businessLatitude,
  businessLongitude: user.businessLongitude,
});
 
exports.updateProfile = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
 
    const name = checkDisplayName(body.ownerName, { max: 100 });
    if (name.error) return res.status(400).json({ message: name.error });
 
    const phone = checkPhone(body.phoneNumber);
    if (phone.error) return res.status(400).json({ message: phone.error });
 
    // Address and map pin travel together: all three or none.
    const touchesLocation =
      body.businessAddress !== undefined ||
      body.businessLatitude !== undefined ||
      body.businessLongitude !== undefined;
 
    let address = null;
    let latitude = null;
    let longitude = null;
 
    if (touchesLocation) {
      address = cleanText(body.businessAddress);
      if (address === null || address.length < 5 || address.length > 255) {
        return res
          .status(400)
          .json({ message: "Business address must be 5-255 characters." });
      }
      if (/[<>]/.test(address)) {
        return res
          .status(400)
          .json({ message: "Business address cannot contain < or >." });
      }
 
      latitude = toCoordinate(body.businessLatitude, -90, 90);
      longitude = toCoordinate(body.businessLongitude, -180, 180);
      if (latitude === null || longitude === null) {
        return res
          .status(400)
          .json({ message: "Pin your business location on the map." });
      }
    }
 
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== "Owner" || user.accountStatus !== "Active") {
      return res.status(401).json({ message: "Session is no longer valid." });
    }
 
    user.ownerName = name.value;
    user.phoneNumber = phone.value;
    if (touchesLocation) {
      user.businessAddress = address;
      user.businessLatitude = latitude;
      user.businessLongitude = longitude;
    }
    await user.save({ validateBeforeSave: false });
 
    try {
      await writeAudit(req, "UPDATE", "User", user._id, "Owner profile updated.");
    } catch (auditError) {
      console.error("Owner profile audit failed:", auditError.message);
    }
 
    return res.json({ message: "Profile updated.", profile: profileView(user) });
  } catch (error) {
    console.error("Update owner profile failed:", error.message);
    return res.status(500).json({ message: "Could not save your profile." });
  }
};
 