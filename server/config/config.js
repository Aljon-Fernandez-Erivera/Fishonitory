const path = require("path");
const dotenv = require("dotenv");

// Prefer the root .env as the main source of configuration for local and deployment setups.
// The server-level .env is only a fallback for older setups.
const rootEnvPath = path.resolve(__dirname, "../../.env");
const serverEnvPath = path.resolve(__dirname, "../.env");

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: serverEnvPath });

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

// Keep startup resilient in deployment environments where env vars are injected by the host.
if (!config.mongoURI) {
  console.warn(
    "Warning: MONGODB_URI is undefined or missing. The app may fail when the database is used.",
  );
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
