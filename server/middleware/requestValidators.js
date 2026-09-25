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
const MAX_NAME_LENGTH = 120;

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

  const visibility = req.body?.visibility;
  if (visibility !== undefined && !["public", "private"].includes(visibility)) {
    return res
      .status(400)
      .json({ message: "Note visibility must be 'public' or 'private'." });
  }

  const isTask = req.body?.isTask;
  if (isTask !== undefined && typeof isTask !== "boolean") {
    return res.status(400).json({ message: "'isTask' must be a boolean." });
  }

  const taskStatus = req.body?.taskStatus;
  if (taskStatus !== undefined && !["pending", "done"].includes(taskStatus)) {
    return res
      .status(400)
      .json({ message: "Task status must be 'pending' or 'done'." });
  }

  req.validated = {
    text,
    visibility: visibility || "public",
    isTask: Boolean(isTask),
    taskStatus: taskStatus || (isTask ? "pending" : undefined),
  };
  return next();
};

const validateNoteUpdate = (req, res, next) => {
  const changes = {};
  const { text, resolved, pinned, visibility, isTask, taskStatus, completedBy } =
    req.body ?? {};

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

  if (visibility !== undefined) {
    if (!["public", "private"].includes(visibility)) {
      return res
        .status(400)
        .json({ message: "Note visibility must be 'public' or 'private'." });
    }
    changes.visibility = visibility;
  }

  if (isTask !== undefined) {
    if (typeof isTask !== "boolean")
      return res.status(400).json({ message: "'isTask' must be a boolean." });
    changes.isTask = isTask;
    if (isTask && changes.taskStatus === undefined) changes.taskStatus = "pending";
  }

  if (taskStatus !== undefined) {
    if (!["pending", "done"].includes(taskStatus))
      return res
        .status(400)
        .json({ message: "Task status must be 'pending' or 'done'." });
    changes.taskStatus = taskStatus;
  }

  // Free-text name a staff member enters when marking a task done. The
  // controller enforces that it's actually present when taskStatus flips to
  // "done" — this middleware's job is just to shape and bound the value.
  if (completedBy !== undefined) {
    if (typeof completedBy !== "string")
      return res.status(400).json({ message: "'completedBy' must be a string." });
    const trimmed = completedBy.replace(CONTROL_CHARS, "").trim();
    if (trimmed.length > MAX_NAME_LENGTH)
      return res
        .status(400)
        .json({ message: `Name cannot exceed ${MAX_NAME_LENGTH} characters.` });
    changes.completedBy = trimmed;
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

  if (body.customerName !== undefined) {
    string(body.customerName, "Customer name", { required: false, min: 2, max: 120 });
  }
  if (body.customerEmail !== undefined) {
    email(body.customerEmail, "Customer email");
  }
  if (body.customerPhone !== undefined) {
    phone(body.customerPhone, "Customer phone");
  }

  number(body.discount ?? 0, "Discount", { min: 0, max: 100000000 });
});

const validateSaleUpdate = validate((req) => {
  const body = req.body || {};
  // deliveryStatus removed from the Sale schema — Order now owns the
  // pre-payment fulfillment lifecycle. A Sale only exists once an order (or
  // an instant walk-in checkout) is already paid, so only customer details
  // remain editable here.
  if (body.customerName !== undefined) {
    string(body.customerName, "Customer name", { required: false, min: 2, max: 120 });
  }
  if (body.customerEmail !== undefined) {
    email(body.customerEmail, "Customer email");
  }
  if (body.customerPhone !== undefined) {
    phone(body.customerPhone, "Customer phone");
  }
});

const ORDER_DELIVERY_METHODS = ["pickup", "rider", "courier"];
const MAX_ORDER_NOTES_LENGTH = 500;

const validateOrderCreate = (req, res, next) => {
  const body = req.body || {};

  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
    return res
      .status(400)
      .json({ message: "Order must contain between 1 and 100 items." });
  }
  for (const item of body.items) {
    if (!item?.itemId || !mongoose.Types.ObjectId.isValid(item.itemId)) {
      return res
        .status(400)
        .json({ message: "Each order item needs a valid inventory item ID." });
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
      return res
        .status(400)
        .json({ message: "Each order item needs a valid quantity." });
    }
  }

  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  if (!customerName || customerName.length < 2 || customerName.length > 120) {
    return res.status(400).json({ message: "Customer name is required." });
  }

  const customerEmail =
    typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) {
    return res.status(400).json({ message: "Enter a valid customer email address." });
  }

  const customerPhone =
    typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";

  if (!ORDER_DELIVERY_METHODS.includes(body.deliveryMethod)) {
    return res
      .status(400)
      .json({ message: "Delivery method must be 'pickup', 'rider', or 'courier'." });
  }

  const courierName =
    typeof body.courierName === "string" ? body.courierName.trim() : "";
  if (body.deliveryMethod === "courier" && !courierName) {
    return res
      .status(400)
      .json({ message: "Enter the courier name for courier deliveries." });
  }

  const requestedDate = new Date(body.requestedDate);
  if (Number.isNaN(requestedDate.getTime())) {
    return res.status(400).json({ message: "Requested date is invalid." });
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > MAX_ORDER_NOTES_LENGTH) {
    return res
      .status(400)
      .json({ message: `Order notes cannot exceed ${MAX_ORDER_NOTES_LENGTH} characters.` });
  }

  const discount = Number(body.discount ?? 0);
  if (Number.isNaN(discount) || discount < 0 || discount > 100000000) {
    return res.status(400).json({ message: "Discount is invalid." });
  }

  req.validated = {
    items: body.items,
    customerName,
    customerEmail,
    customerPhone,
    deliveryMethod: body.deliveryMethod,
    courierName,
    requestedDate,
    notes,
    discount,
  };
  return next();
};

const validateOrderUpdate = (req, res, next) => {
  const changes = {};
  const { deliveryStatus, paymentStatus } = req.body ?? {};

  if (deliveryStatus !== undefined) {
    if (!["pending", "fulfilled"].includes(deliveryStatus)) {
      return res
        .status(400)
        .json({ message: "Delivery status must be 'pending' or 'fulfilled'." });
    }
    changes.deliveryStatus = deliveryStatus;
  }

  if (paymentStatus !== undefined) {
    if (!["unpaid", "paid"].includes(paymentStatus)) {
      return res
        .status(400)
        .json({ message: "Payment status must be 'unpaid' or 'paid'." });
    }
    changes.paymentStatus = paymentStatus;
  }

  if (!Object.keys(changes).length)
    return res.status(400).json({ message: "No valid changes supplied." });

  req.validated = changes;
  return next();
};

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
  validateOrderCreate,
  validateOrderUpdate,
  validateSale,
  validateSaleUpdate,
  validateStaff,
  validateStaffAttendance,
  validateStaffOtp,
  validateStaffUpdate,
  validateTank,
};