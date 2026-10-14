const SECRET_FIELD_PATTERN = /password|otp|one.?time.?code|recovery.?code|totp|secret|token/i;

function sanitizeString(value) {
  return Array.from(value.normalize("NFKC"))
    .filter((character) => {
      const code = character.codePointAt(0);
      return code === 0x09 || code === 0x0a || code === 0x0d
        || (code >= 0x20 && !(code >= 0x7f && code <= 0x9f)
          && !(code >= 0x200b && code <= 0x200f)
          && !(code >= 0x202a && code <= 0x202e)
          && !(code >= 0x2060 && code <= 0x206f)
          && code !== 0xfeff);
    })
    .join("");
}

function sanitizeValue(value, fieldName = "") {
  if (typeof value === "string") {
    return SECRET_FIELD_PATTERN.test(fieldName) ? value : sanitizeString(value);
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (!value || typeof value !== "object") return value;

  const sanitized = {};
  for (const [key, child] of Object.entries(value)) {
    
    // Request data must never supply MongoDB operators or dotted paths.
    if (key.startsWith("$") || key.includes(".") || ["__proto__", "prototype", "constructor"].includes(key)) {
      const error = new Error("Request contains an unsupported field.");
      error.statusCode = 400;
      throw error;
    }
    sanitized[key] = sanitizeValue(child, key);
  }
  return sanitized;
}

module.exports = function sanitizeRequestBody(req, res, next) {
  if (!req.body || typeof req.body !== "object") return next();
  try {
    req.body = sanitizeValue(req.body);
    return next();
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
};
