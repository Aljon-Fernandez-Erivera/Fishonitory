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

const validateFish = validate((req) => {
  const body = req.body || {};
  string(body.name, "Fish name", { min: 2, max: 100 });
  string(body.species, "Species", { min: 2, max: 100 });
  oneOf(body.category || "Fish", "Category", ["Fish", "Fish Food"]);
  number(body.price, "Price", { min: 0, max: 10000000 });
  number(body.costPrice ?? 0, "Cost price", { min: 0, max: 10000000 });
  number(body.quantity, "Quantity", { integer: true, min: 0, max: 10000000 });
  string(body.description, "Description", { required: false, max: 1000 });
  string(body.photoUrl, "Photo", { required: false, max: 1500000 });
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
  }
  if (body.notes !== undefined)
    string(body.notes, "Maintenance notes", { required: false, max: 1000 });
});

const validateNote = validate((req) => {
  string(req.body?.text, "Note", { min: 1, max: 1000 });
});

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
  validateFish,
  validateId,
  validateNote,
  validateSale,
  validateStaff,
  validateStaffAttendance,
  validateStaffOtp,
  validateStaffUpdate,
  validateTank,
};
