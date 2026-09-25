
const mongoose = require("mongoose");
const {
  dateKey,
  email,
  number,
  objectId,
  oneOf,
  password,
  phone,
  string,
  validate,
} = require("./validateInput");

const tankStatuses = [
  "Needs Cleaning",
  "Clean",
  "For Replacement",
  "Damaged",
  "Under Maintenance",
  "Available",
];
const attendanceStatuses = ["Present", "Late", "Absent", "Leave", "DayOff"];

const staffFields = (body, includePassword) => {
  string(body.staffName, "Staff name", { min: 2, max: 100 });
  oneOf(body.staffPosition, "Staff position", ["Staff", "Master Staff"]);
  email(body.staffEmail, "Staff email");
  phone(body.staffPhoneNumber, "Staff phone number");
  if (includePassword || body.staffPassword)
    password(body.staffPassword, "Staff password");
};

const validateStaff = validate((req) => staffFields(req.body || {}, true));
const validateStaffUpdate = validate((req) =>
  staffFields(req.body || {}, false),
);
const validateStaffOtp = validate((req) => {
  email(req.body?.staffEmail, "Staff email");
  if (!/^\d{6}$/.test(String(req.body?.otp || ""))) {
    throw Object.assign(new Error("OTP must be a 6-digit number."), {
      statusCode: 400,
    });
  }
});
const validateDeletionOtp = validate((req) => {
  if (!/^\d{6}$/.test(String(req.body?.otp || ""))) {
    throw Object.assign(new Error("Deletion verification code must be a 6-digit number."), {
      statusCode: 400,
    });
  }
});

const validateFish = validate((req) => {
  const body = req.body || {};
  string(body.name, "Fish name", { min: 2, max: 100 });
  string(body.species, "Species", { min: 2, max: 100 });
  oneOf(body.category || "Fish", "Category", ["Fish", "Fish Food"]);
  number(body.price, "Price", { min: 1, max: 10000000 });
  number(body.costPrice ?? 0, "Cost price", { min: 1, max: 10000000 });
number(body.quantity, "Quantity", { integer: true, min: 1, max: 10000000 });
  string(body.description, "Description", { required: false, max: 1000 });
  string(body.photoUrl, "Photo", { required: false, max: 2048 });
  if (body.photoUrl && !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(body.photoUrl)) {
    throw Object.assign(new Error("Photo must be a Cloudinary image URL."), { statusCode: 400 });
  }
  if (body.tankId) objectId(body.tankId, "Tank ID");
});

const validateTank = validate((req) => {
  const body = req.body || {};
  if (req.method === "POST" || body.name !== undefined) {
    string(body.name, "Tank name", { min: 2, max: 100 });
  }
  if (body.status !== undefined)
    oneOf(body.status, "Tank status", tankStatuses);
if (body.nextMaintenance) {
    const date = new Date(body.nextMaintenance);
    if (Number.isNaN(date.getTime())) {
      throw Object.assign(new Error("Maintenance date is invalid."), {
        statusCode: 400,
      });
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (date < startOfToday) {
      throw Object.assign(
        new Error("Maintenance date must be today or a future date."),
        { statusCode: 400 },
      );
    }
  }
  if (body.notes !== undefined)
    string(body.notes, "Maintenance notes", { required: false, max: 1000 });
});

const MAX_NOTE_LENGTH = 1000;

// Strip control characters BUT keep \n (newline) and \t (tab).
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

/**
 * Only a real primitive string survives. Anything else — an object like
 * { $ne: null }, an array, a number — is rejected outright. This is what
 * stops operator injection, not a character whitelist.
 */
const cleanNoteText = (raw) => {
  if (typeof raw !== "string") return null;
  return raw
    .replace(/\r\n?/g, "\n")        // normalise Windows / old Mac line endings
    .replace(CONTROL_CHARS, "")     // \n and \t deliberately excluded above
    .replace(/\n{4,}/g, "\n\n\n")   // cap runaway blank lines, don't forbid them
    .trim();
};

const validateNoteCreate = (req, res, next) => {
  const text = cleanNoteText(req.body?.text);

  if (text === null)
    return res.status(400).json({ message: "Note text must be a string." });
  if (!text)
    return res.status(400).json({ message: "Note text is required." });
  if (text.length > MAX_NOTE_LENGTH)
    return res
      .status(400)
      .json({ message: `Note cannot exceed ${MAX_NOTE_LENGTH} characters.` });

  req.validated = { text };
  return next();
};

const validateNoteUpdate = (req, res, next) => {
  const changes = {};
  const { text, resolved, pinned } = req.body ?? {};

  if (text !== undefined) {
    const cleaned = cleanNoteText(text);
    if (cleaned === null)
      return res.status(400).json({ message: "Note text must be a string." });
    if (!cleaned)
      return res.status(400).json({ message: "Note text cannot be empty." });
    if (cleaned.length > MAX_NOTE_LENGTH)
      return res
        .status(400)
        .json({ message: `Note cannot exceed ${MAX_NOTE_LENGTH} characters.` });
    changes.text = cleaned;
  }

  if (resolved !== undefined) {
    if (typeof resolved !== "boolean")
      return res.status(400).json({ message: "'resolved' must be a boolean." });
    changes.resolved = resolved;
  }

  if (pinned !== undefined) {
    if (typeof pinned !== "boolean")
      return res.status(400).json({ message: "'pinned' must be a boolean." });
    changes.pinned = pinned;
  }

  if (!Object.keys(changes).length)
    return res.status(400).json({ message: "No valid changes supplied." });

  req.validated = changes;
  return next();
};

/** Blocks { "_id": { "$gt": "" } } style params reaching the query. */
const validateObjectIdParam = (paramName = "id") => (req, res, next) => {
  const value = req.params[paramName];
  if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value))
    return res.status(400).json({ message: "Invalid note id." });
  return next();
};


const validateSale = validate((req) => {
  const body = req.body || {};
  if (
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 100
  ) {
    throw Object.assign(
      new Error("Sale must contain between 1 and 100 items."),
      { statusCode: 400 },
    );
  }
  body.items.forEach((item) => {
    objectId(item.itemId, "Inventory item ID");
    number(item.quantity, "Item quantity", {
      integer: true,
      min: 1,
      max: 100000,
    });
  });
  number(body.discount ?? 0, "Discount", { min: 0, max: 100000000 });
});

const validateAttendanceStatus = validate((req) => {
  oneOf(req.body?.status, "Attendance status", attendanceStatuses);
});

const validateAccountStatus = validate((req) => {
  oneOf(req.body?.status, "Account status", ["Active", "Disabled"]);
});

const validateStaffAttendance = validate((req) => {
  objectId(req.body?.staffId, "Staff ID");
  dateKey(req.body?.dateKey);
  oneOf(req.body?.status, "Attendance status", attendanceStatuses);
});

const validateId = (field) =>
  validate((req) => objectId(req.params[field], `${field} ID`));

module.exports = {
  validateAccountStatus,
  validateAttendanceStatus,
  validateDeletionOtp,
  validateFish,
  validateId,
  validateNoteCreate,
  validateNoteUpdate,
  validateObjectIdParam,
  validateSale,
  validateStaff,
  validateStaffAttendance,
  validateStaffOtp,
  validateStaffUpdate,
  validateTank,
};