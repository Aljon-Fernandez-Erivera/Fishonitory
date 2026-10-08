// One place for the password rules used by registration, forgot-password and
// change-password. Mirrors server/utils/validators.js (checkNewPassword).

export const PASSWORD_MAX = 64;

const COMMON = new Set([
  "password1", "password12", "password123", "password1!", "passw0rd",
  "qwerty123", "qwerty12345", "welcome123", "admin1234", "admin12345",
  "letmein123", "iloveyou1", "abc12345", "abcd1234", "12345678a",
  "a12345678", "fishonitory1", "fishonitory123", "changeme1", "p@ssw0rd",
  "p@ssword1", "p@ssw0rd1", "pa$$w0rd", "monkey123", "dragon123",
]);

// Same filter as the login form: only letters, numbers and @ # $ !
export const sanitizePassword = (value) =>
  String(value ?? "")
    .replace(/[^a-zA-Z0-9@#$!]/g, "")
    .slice(0, PASSWORD_MAX);

// Returns an error message, or "" when the password is acceptable.
export function getPasswordProblem(password, { email = "" } = {}) {
  if (!password) return "Enter a password.";
  if (password.length < 8 || password.length > PASSWORD_MAX)
    return `Use 8-${PASSWORD_MAX} characters.`;
  if (!/^[A-Za-z0-9@#$!]+$/.test(password))
    return "Only letters, numbers, and @ # $ ! are allowed.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return "Include at least one letter and one number.";
  if (/^(.)\1+$/.test(password))
    return "Do not use a single repeated character.";
  if (COMMON.has(password.toLowerCase()))
    return "That password is too common. Choose a different one.";

  const local = String(email).split("@")[0].toLowerCase();
  if (local.length >= 4 && password.toLowerCase().includes(local))
    return "Do not include your email name in the password.";

  return "";
}