export const PH_LOCAL_PHONE_LENGTH = 10;

export function sanitizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
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