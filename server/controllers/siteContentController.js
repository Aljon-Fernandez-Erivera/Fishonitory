const SiteContent = require("../models/SiteContent");

function sanitizeContentText(value) {
  if (typeof value !== "string") return null;
  return Array.from(value.normalize("NFKC").replace(/\r\n?/g, "\n"))
    .filter((character) => {
      const code = character.codePointAt(0);
      return code === 0x0a || code === 0x09 || (code >= 0x20 && !(code >= 0x7f && code <= 0x9f)
        && !(code >= 0x200b && code <= 0x200f) && !(code >= 0x202a && code <= 0x202e)
        && !(code >= 0x2060 && code <= 0x206f) && code !== 0xfeff);
    })
    .join("")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

const CONTENT_FIELDS = [
  "aboutEyebrow",
  "aboutHeadline",
  "aboutDescription",
  "mission",
  "vision",
  "contactHeadline",
  "contactMessage",
  "supportEmail",
  "supportPhone",
  "supportHours",
];

const DEFAULT_SITE_CONTENT = {
  aboutEyebrow: "ABOUT FISHONITORY",
  aboutHeadline: "Clarity for every fish, tank, and sale.",
  aboutDescription: "Fishonitory helps ornamental fish businesses manage livestock, tanks, sales, staff, attendance, purchases, and business records in one workspace.",
  mission: "Give fish businesses a clear, dependable place to manage daily operations and make informed decisions.",
  vision: "Support healthier aquatic businesses with better visibility into the work behind every tank and sale.",
  contactHeadline: "How can we help?",
  contactMessage: "For account or workspace support, contact your business owner or the Fishonitory administrator.",
  supportEmail: "",
  supportPhone: "",
  supportHours: "",
};

exports.getSiteContent = async (req, res) => {
  const stored = await SiteContent.findOne({ key: "global" }).select(CONTENT_FIELDS.join(" ")).lean();
  const content = { ...DEFAULT_SITE_CONTENT, ...(stored || {}) };
  return res.json({ content });
};

exports.updateSiteContent = async (req, res) => {
  const input = req.body || {};
  const content = {};
  for (const field of CONTENT_FIELDS) {
    if (typeof input[field] !== "string") {
      return res.status(400).json({ message: `Enter valid text for ${field}.` });
    }
    const sanitized = sanitizeContentText(input[field]);
    if (sanitized === null) {
      return res.status(400).json({ message: `Enter valid text for ${field}.` });
    }
    content[field] = sanitized;
  }

  content.supportEmail = content.supportEmail.toLowerCase();

  for (const [field, maxLength] of Object.entries({
    aboutEyebrow: 80,
    aboutHeadline: 120,
    aboutDescription: 1200,
    mission: 600,
    vision: 600,
    contactHeadline: 120,
    contactMessage: 600,
    supportEmail: 254,
    supportPhone: 40,
    supportHours: 120,
  })) {
    if (content[field].length > maxLength) {
      return res.status(400).json({ message: `${field} cannot exceed ${maxLength} characters.` });
    }
  }
  if (!content.aboutHeadline || !content.aboutDescription || !content.contactHeadline || !content.contactMessage) {
    return res.status(400).json({ message: "About and contact headings and descriptions are required." });
  }
  // Accept a conventional email address only; the stored value is later used
  // in a mailto: link, so reject whitespace, markup, and malformed domains.
  const emailPattern = /^(?=.{1,254}$)(?=.{1,64}@)[A-Z0-9!#$%&'*+/=?^_`{|}~.-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i;
  if (content.supportEmail && !emailPattern.test(content.supportEmail)) {
    return res.status(400).json({ message: "Enter a valid support email address." });
  }
  if (content.supportPhone && (!/^[+\d().\-\s]+$/.test(content.supportPhone)
    || content.supportPhone.replace(/\D/g, "").length < 7)) {
    return res.status(400).json({ message: "Enter a valid support phone number." });
  }

  const updated = await SiteContent.findOneAndUpdate(
    { key: "global" },
    { $set: { ...content, updatedBy: req.user.userId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  return res.json({ message: "About and contact information saved.", content: updated });
};

