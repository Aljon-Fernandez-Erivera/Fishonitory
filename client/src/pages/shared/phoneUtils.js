export const PH_LOCAL_PHONE_LENGTH = 10;

export function sanitizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
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
