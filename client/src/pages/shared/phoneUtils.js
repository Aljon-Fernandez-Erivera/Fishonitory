export const PH_LOCAL_PHONE_LENGTH = 10;

export function sanitizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

// Convert supported Philippine national formats to E.164 for API requests.
// Accepts 09123456789, 9123456789, 639123456789, and +639123456789.
export function normalizePhoneToE164(value, countryIso = "PH") {
  const raw = String(value || "").trim();
  const digits = sanitizePhoneDigits(raw);
  if (!digits) return "";
  if (raw.startsWith("+")) return `+${digits}`;

  if (countryIso === "PH") {
    if (digits.length === 11 && digits.startsWith("0")) {
      return `+63${digits.slice(1)}`;
    }
    if (digits.length === 10 && digits.startsWith("9")) {
      return `+63${digits}`;
    }
    if (digits.length === 12 && digits.startsWith("63")) {
      return `+${digits}`;
    }
  }

  return `+${digits}`;
}

// Keep phone inputs readable while allowing an optional international prefix.
export function formatPhoneInput(value, maxDigits = 15) {
  const raw = String(value || "");
  const hasPlus = raw.trimStart().startsWith("+");
  const digits = sanitizePhoneDigits(raw).slice(0, maxDigits);
  const groups = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)].filter(Boolean);
  const grouped = groups.join(" ");
  return `${hasPlus ? "+" : ""}${grouped}`;
}

export function maxLocalDigitsForCountry(countryIso) {
  return countryIso === "PH" ? PH_LOCAL_PHONE_LENGTH : 14;
}

export function isValidLocalPhoneForCountry(digits, countryIso) {
  if (countryIso === "PH") {
    return /^9\d{9}$/.test(digits);
  }
  return digits.length >= 4 && digits.length <= 14;
}
