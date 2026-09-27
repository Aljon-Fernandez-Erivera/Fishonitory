const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const config = require("../config/config");
const User = require("../models/User");

async function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error('Usage: node server/scripts/createSuperAdmin.js <email> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  await connectDB(config.mongoURI);

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.error(`A user with email ${email} already exists (role: ${existing.role}). Aborting.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const admin = new User({
    email: email.toLowerCase().trim(),
    password, // hashed automatically by the User model's pre-save hook
    role: "superAdmin",
    accountStatus: "Active",
    // superAdmin phoneNumber is still required by the schema (shared field
    // across roles) — using a placeholder is fine here since it's never
    // used for anything on this role; change it if you want a real number.
    phoneNumber: "+10000000000",
  });

  await admin.save();
  console.log(`Super Admin account created for ${admin.email}.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to create Super Admin:", error.message);
  process.exit(1);
});