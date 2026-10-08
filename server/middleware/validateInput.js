const mongoose = require("mongoose");
const validator = require("validator");
const { checkNewPassword } = require("../utils/validators");

function fail(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

// True for control characters (0-31 and DELETE). Done with char codes so the
// code has no control characters inside a regex (ESLint no-control-regex).
const hasControlChars = (text) =>
  Array.from(text).some((char) => {
    const code = char.codePointAt(0);
    return code <= 0x1f || code === 0x7f;
  });

function string(value, field, { required = true, min = 1, max = 255 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) fail(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string") fail(`${field} must be text.`);

  const text = value.trim();
  if (text.length < min || text.length > max) {
    fail(`${field} must be between ${min} and ${max} characters.`);
  }
  if (hasControlChars(text)) {
    fail(`${field} contains invalid control characters.`);
  }
  return text;
}

function email(value, field = "Email") {
  const text = string(value, field, { max: 254 }).toLowerCase();
  if (!validator.isEmail(text)) fail(`${field} must be a valid email address.`);
  return text;
}

// New-password rule (registration, password reset, change password):
// 8-64 characters, letters / numbers / @ # $ ! only, at least one letter and
// one number, not common or repeated, and not containing the email name.
// The value is checked exactly as sent (no trimming), so a password with
// spaces or other characters the login form strips is rejected, not altered.
function password(value, field = "Password", { email: emailValue = "" } = {}) {
  if (typeof value !== "string") fail(`${field} must be text.`);

  const problem = checkNewPassword(value, {
    email: typeof emailValue === "string" ? emailValue : "",
  });
  if (problem) fail(problem);

  return value;
}

function phone(value, field = "Phone number") {
  const text = string(value, field, { min: 8, max: 16 });
  if (!/^\+[1-9]\d{6,14}$/.test(text)) fail(`${field} must use international E.164 format, for example +639171234567.`);
  return text;
}

function number(
  value,
  field,
  { integer = false, min = 0, max = 100000000 } = {},
) {
  if (value === undefined || value === null || value === "")
    fail(`${field} is required.`);
  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    (integer && !Number.isInteger(parsed)) ||
    parsed < min ||
    parsed > max
  ) {
    fail(`${field} must be a valid number between ${min} and ${max}.`);
  }
  return parsed;
}

function objectId(value, field = "ID") {
  if (!mongoose.isValidObjectId(value)) fail(`${field} is invalid.`);
  return value;
}

function oneOf(value, field, values) {
  if (!values.includes(value))
    fail(`${field} must be one of: ${values.join(", ")}.`);
  return value;
}

function dateKey(value, field = "Date") {
  const text = string(value, field, { min: 10, max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    fail(`${field} must use YYYY-MM-DD format.`);
  const date = new Date(`${text}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    fail(`${field} is invalid.`);
  }
  return text;
}

function validate(handler) {
  return (req, res, next) => {
    try {
      handler(req);
      next();
    } catch (error) {
      return res
        .status(error.statusCode || 400)
        .json({ message: error.message });
    }
  };
}

module.exports = {
  dateKey,
  email,
  number,
  objectId,
  oneOf,
  password,
  phone,
  string,
  validate,
};