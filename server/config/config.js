const path = require("path");
const dotenv = require("dotenv");

// Load backend env files explicitly.
// The root .env is allowed to override the server .env so edits in either file are picked up.
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const config = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  totpEncryptionKey: process.env.TOTP_ENCRYPTION_KEY,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  nodeEnv: process.env.NODE_ENV || "development",
};

// Fail fast immediately if MONGODB_URI could not be read
if (!config.mongoURI) {
  console.error("\n FATAL: MONGODB_URI is undefined or missing in .env!");
  console.error(
    `Attempted resolution path: ${path.resolve(__dirname, "../.env")}\n`,
  );
  process.exit(1);
}

if (!config.jwtSecret) {
  if (config.nodeEnv === "production") {
    console.error("FATAL: JWT_SECRET must be configured in production.");
    process.exit(1);
  }

  config.jwtSecret = "development-only-fishonitory-secret";
  console.warn("Warning: using the development JWT secret.");
}

if (!config.totpEncryptionKey) {
  if (config.nodeEnv === "production") {
    console.error("FATAL: TOTP_ENCRYPTION_KEY must be configured in production.");
    process.exit(1);
  }

  config.totpEncryptionKey = `${config.jwtSecret}:local-totp-encryption`;
  console.warn("Warning: using a development-only TOTP encryption key.");
}

module.exports = config;
