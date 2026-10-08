// Shared input rules for password and profile changes.
// The client mirrors these rules (ChangePasswordDialog.jsx, AdminAccount.jsx).
// The server never "fixes" a password silently: it rejects anything invalid.

const PASSWORD_CHARS = /^[A-Za-z0-9@#$!]+$/; // same set the login form allows

const COMMON_PASSWORDS = new Set([
  "password1", "password12", "password123", "password1!", "passw0rd",
  "qwerty123", "qwerty12345", "welcome123", "admin1234", "admin12345",
  "letmein123", "iloveyou1", "abc12345", "abcd1234", "12345678a",
  "a12345678", "fishonitory1", "fishonitory123", "changeme1", "p@ssw0rd",
  "p@ssword1", "p@ssw0rd1", "pa$$w0rd", "monkey123", "dragon123",
]);

// Returns an error message, or "" when the password is acceptable.
function checkNewPassword(value, { email = "", current = "" } = {}) {
  if (typeof value !== "string") return "Enter a valid new password.";
  if (value.length < 8 || value.length > 64)
    return "Use 8-64 characters.";
  if (!PASSWORD_CHARS.test(value))
    return "Only letters, numbers, and @ # $ ! are allowed.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value))
    return "Include at least one letter and one number.";
  if (/^(.)\1+$/.test(value))
    return "Do not use a single repeated character.";
  if (COMMON_PASSWORDS.has(value.toLowerCase()))
    return "That password is too common. Choose a different one.";

  const local = String(email).split("@")[0].toLowerCase();
  if (local.length >= 4 && value.toLowerCase().includes(local))
    return "Do not include your email name in the password.";

  if (current && value === current)
    return "The new password must be different from your current password.";

  return "";
}

// Current password is only compared, never stored. Reject non-strings and
// absurd lengths so they never reach bcrypt.
const isUsablePasswordInput = (value) =>
  typeof value === "string" && value.length > 0 && value.length <= 128;

// ---- Profile text ----------------------------------------------------

// Strips control / zero-width / bidi characters, normalises, collapses spaces.
const isHiddenChar = (code) =>
  code <= 0x1f ||
  (code >= 0x7f && code <= 0x9f) ||
  (code >= 0x200b && code <= 0x200f) ||
  (code >= 0x202a && code <= 0x202e) ||
  (code >= 0x2060 && code <= 0x206f) ||
  code === 0xfeff;

function cleanText(value) {
  if (typeof value !== "string") return null;
  return Array.from(value.normalize("NFKC").replace(/[\t\n\r]/g, " "))
    .filter((char) => !isHiddenChar(char.codePointAt(0)))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

// Display name: 2-60 chars, letters (any language), marks, spaces, . ' -
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

function checkDisplayName(raw, { max = 60 } = {}) {
  const value = cleanText(raw);
  if (value === null) return { error: "Enter a valid name." };
  if (value.length < 2 || value.length > max)
    return { error: `Name must be 2-${max} characters.` };
  if (!NAME_PATTERN.test(value))
    return {
      error: "Name can only contain letters, spaces, apostrophes, periods, and hyphens.",
    };
  return { value };
}

// Phone: accepts spaces, dashes, dots, parentheses; stored as E.164.
function checkPhone(raw) {
  if (typeof raw !== "string") return { error: "Enter a valid phone number." };
  const compact = raw.replace(/[\s.()-]/g, "");
  if (!/^\+[1-9]\d{6,14}$/.test(compact))
    return {
      error: "Use international format, for example +639171234567.",
    };
  return { value: compact };
}

module.exports = {
  checkNewPassword,
  isUsablePasswordInput,
  cleanText,
  checkDisplayName,
  checkPhone,
};