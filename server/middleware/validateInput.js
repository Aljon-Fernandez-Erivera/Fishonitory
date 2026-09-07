const mongoose = require("mongoose");
const validator = require("validator");

function fail(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

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
  if (/[\u0000-\u001F\u007F]/.test(text)) {
    fail(`${field} contains invalid control characters.`);
  }
  return text;
}

function email(value, field = "Email") {
  const text = string(value, field, { max: 254 }).toLowerCase();
  if (!validator.isEmail(text)) fail(`${field} must be a valid email address.`);
  return text;
}

function password(value, field = "Password") {
  const text = string(value, field, { min: 8, max: 128 });
  return text;
}

function phone(value, field = "Phone number") {
  const text = string(value, field, { min: 7, max: 15 });
  if (!/^\d{7,15}$/.test(text)) fail(`${field} must contain 7 to 15 digits.`);
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
