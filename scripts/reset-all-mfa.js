const mongoose = require("mongoose");
const config = require("../server/config/config");
const User = require("../server/models/User");

async function resetAllMfa() {
  await mongoose.connect(config.mongoURI, { serverSelectionTimeoutMS: 10000 });
  const result = await User.updateMany(
    {},
    {
      $set: {
        totpEnabled: false,
        totpSecretCiphertext: "",
        totpSetupCiphertext: "",
        totpSetupExpiresAt: null,
        totpRecoveryCodeHashes: [],
        totpLastUsedCounter: -1,
        totpFailedAttempts: 0,
        totpLockedUntil: null,
      },
    },
  );
  console.log(`MFA reset for ${result.modifiedCount} user account(s).`);
  await mongoose.disconnect();
}

resetAllMfa().catch(async (error) => {
  console.error(`MFA reset failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
