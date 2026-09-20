const crypto = require("crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  return bits ? output + BASE32_ALPHABET[(value << (5 - bits)) & 31] : output;
}

function base32Decode(value) {
  const cleaned = String(value || "").replace(/[\s=]/g, "").toUpperCase();
  let bits = 0;
  let current = 0;
  const bytes = [];

  for (const character of cleaned) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid TOTP secret.");
    current = (current << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function counterForTime(time = Date.now()) {
  return Math.floor(time / 1000 / TOTP_PERIOD_SECONDS);
}

function codeForCounter(secret, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto
    .createHmac("sha1", base32Decode(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 15;
  const value =
    ((digest[offset] & 127) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(value % 1000000).padStart(6, "0");
}

function verifyCode(secret, code, window = 1) {
  if (!/^\d{6}$/.test(String(code || ""))) return null;
  const currentCounter = counterForTime();

  for (let offset = -window; offset <= window; offset += 1) {
    const counter = currentCounter + offset;
    const expected = codeForCounter(secret, counter);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(code)))) {
      return counter;
    }
  }

  return null;
}

function encryptionKey(material) {
  return crypto.createHash("sha256").update(String(material)).digest();
}

function encryptSecret(secret, keyMaterial) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(keyMaterial), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

function decryptSecret(value, keyMaterial) {
  const [iv, authTag, ciphertext] = String(value || "").split(".");
  if (!iv || !authTag || !ciphertext) throw new Error("TOTP secret is unavailable.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(keyMaterial), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

function buildOtpAuthUri(secret, label) {
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent("Fishonitory")}&algorithm=SHA1&digits=6&period=${TOTP_PERIOD_SECONDS}`;
}

function createRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString("hex").toUpperCase());
}

module.exports = {
  buildOtpAuthUri,
  createRecoveryCodes,
  decryptSecret,
  encryptSecret,
  generateSecret,
  verifyCode,
};
