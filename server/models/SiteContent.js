const mongoose = require("mongoose");

const siteContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: "global" },
  aboutEyebrow: { type: String, trim: true, maxlength: 80, default: "ABOUT FISHONITORY" },
  aboutHeadline: { type: String, trim: true, maxlength: 120, default: "Clarity for every fish, tank, and sale." },
  aboutDescription: { type: String, trim: true, maxlength: 1200, default: "Fishonitory helps ornamental fish businesses manage livestock, tanks, sales, staff, attendance, purchases, and business records in one workspace." },
  mission: { type: String, trim: true, maxlength: 600, default: "Give fish businesses a clear, dependable place to manage daily operations and make informed decisions." },
  vision: { type: String, trim: true, maxlength: 600, default: "Support healthier aquatic businesses with better visibility into the work behind every tank and sale." },
  contactHeadline: { type: String, trim: true, maxlength: 120, default: "How can we help?" },
  contactMessage: { type: String, trim: true, maxlength: 600, default: "For account or workspace support, contact your business owner or the Fishonitory administrator." },
  supportEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  supportPhone: { type: String, trim: true, maxlength: 40, default: "" },
  supportHours: { type: String, trim: true, maxlength: 120, default: "" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.model("SiteContent", siteContentSchema);
