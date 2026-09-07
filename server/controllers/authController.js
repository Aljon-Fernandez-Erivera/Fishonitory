const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomInt } = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const LoginAttempt = require("../models/LoginAttempt");
const config = require("../config/config");

// In-memory OTP storage
const pendingOTPs = new Map();

const ACCOUNT_ATTEMPT_LIMIT = 5;
const ACCOUNT_LOCK_MS = 5 * 60 * 1000;
const IP_ATTEMPT_LIMIT = 20;
const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_LOCK_MS = 15 * 60 * 1000;

function getClientIp(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function secondsUntil(date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

function setAuthCookie(res, token) {
  const secure = config.nodeEnv === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `access_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${secure}`,
  );
}

function clearAuthCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
  );
}

async function getActiveIpLock(ip) {
  const record = await LoginAttempt.findOne({ ip });
  if (!record?.blockedUntil) return null;

  if (record.blockedUntil > new Date()) {
    return record.blockedUntil;
  }

  await LoginAttempt.updateOne(
    { _id: record._id },
    { $set: { blockedUntil: null, failedAttempts: 0, windowStartedAt: new Date() } },
  );
  return null;
}

async function recordIpFailure(ip) {
  const now = new Date();
  let record = await LoginAttempt.findOne({ ip });

  if (!record || now.getTime() - record.windowStartedAt.getTime() >= IP_WINDOW_MS) {
    record = await LoginAttempt.findOneAndUpdate(
      { ip },
      {
        $set: {
          failedAttempts: 1,
          windowStartedAt: now,
          blockedUntil: null,
        },
        $setOnInsert: { ip },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } else {
    record.failedAttempts += 1;
    if (record.failedAttempts >= IP_ATTEMPT_LIMIT) {
      record.blockedUntil = new Date(now.getTime() + IP_LOCK_MS);
    }
    await record.save();
  }

  return record;
}

async function recordAccountFailure(user) {
  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const update = { failedLoginAttempts: failedAttempts };

  if (failedAttempts >= ACCOUNT_ATTEMPT_LIMIT) {
    update.loginLockedUntil = new Date(Date.now() + ACCOUNT_LOCK_MS);
  }

  await User.updateOne({ _id: user._id }, { $set: update });
  return update.loginLockedUntil || null;
}

// Helper function to create Nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send OTP muna
exports.sendOtp = async (req, res) => {
  try {
    const rawEmail = req.body.email;

    //check kung may email sa request
    if (!rawEmail) {
      return res.status(400).json({ message: "Email is required." });
    }
    const email = rawEmail.trim().toLowerCase();

    //check kung email ay gamit na ng iba
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    // Generate 6-digit integer OTP
    const generatedOTP = randomInt(100000, 1000000);

    // Save in memory tas mag expire ng 5 mins
    pendingOTPs.set(email, {
      otp: generatedOTP,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Try sending email via Nodemailer
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Fishonitory" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Fishonitory - Registration Verification OTP",
        text: `Your 6-digit verification code is: ${generatedOTP}. This code will expire in 5 minutes.`,
      });
    } catch (emailErr) {
      console.error("Nodemailer failed to send the OTP email.");
      console.error("Email error:", emailErr.message || emailErr);
      console.error(
        "Check EMAIL_USER / EMAIL_PASS, and make sure Gmail App Passwords are being used.",
      );
      return res.status(500).json({
        message:
          "OTP was generated, but the email could not be sent. Check the backend console for the mail error.",
      });
    }
    //message confirmation once successful na generate and send ng OTP at nasend sa email
    res.json({
      message:
        "OTP has been sent to your email address. Please check your inbox or spam folder.",
    });
    //nasa RegisterBusinessPage.jsx yung error handling kung may error sa backend.
  } catch (err) {
    console.error("--- DB / OTP ERROR DETAILS ---");
    console.error(err);
    console.error("------------------------------");

    res.status(500).json({
      message: "Database query failed. Check the backend console for details.",
      error: err.message,
    });
  }
};

// Verify OTP and Register
exports.verifyAndRegister = async (req, res) => {
  try {
    const {
      businessName,
      ownerName,
      password,
      businessAddress,
      phoneNumber,
      otp,
    } = req.body;
    const email = req.body.email.trim().toLowerCase();

    const record = pendingOTPs.get(email);
    if (!record) {
      return res
        .status(400)
        .json({
          message: "No pending OTP requested for this email or it has expired.",
        });
    }

    if (Date.now() > record.expiresAt) {
      pendingOTPs.delete(email);
      return res
        .status(400)
        .json({ message: "OTP code has expired. Please request a new one." });
    }

    if (parseInt(otp, 10) !== record.otp) {
      return res
        .status(400)
        .json({ message: "Invalid OTP code. Please try again." });
    }

    const newUser = new User({
      businessName,
      ownerName,
      email,
      password,
      businessAddress,
      phoneNumber,
      otp: record.otp,
      role: "Owner",
    });

    await newUser.save();
    pendingOTPs.delete(email);

    res
      .status(201)
      .json({
        message: "OTP verified! Business Owner account successfully created.",
      });
  } catch (err) {
    console.error("--- VERIFY / REGISTER ERROR DETAILS ---");
    console.error(err);
    console.error("----------------------------------------");
    res
      .status(500)
      .json({ message: err.message || "Server error during registration." });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    const rawEmail = req.body.email;
    const clientIp = getClientIp(req);

    if (!rawEmail || !password) {
      return res
        .status(400)
        .json({ message: "Please enter both email and password." });
    }

    const ipLock = await getActiveIpLock(clientIp);
    if (ipLock) {
      return res.status(429).json({
        code: "IP_RATE_LIMITED",
        message: "Too many login attempts. Please try again later.",
        retryAfterSeconds: secondsUntil(ipLock),
      });
    }

    const email = rawEmail.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      const ipRecord = await recordIpFailure(clientIp);
      if (ipRecord.blockedUntil) {
        return res.status(429).json({
          code: "IP_RATE_LIMITED",
          message: "Too many login attempts. Please try again later.",
          retryAfterSeconds: secondsUntil(ipRecord.blockedUntil),
        });
      }
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.accountStatus === "Disabled") {
      return res
        .status(403)
        .json({ message: "This account has been disabled." });
    }

    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      return res.status(423).json({
        code: "ACCOUNT_LOCKED",
        message: "Login locked.",
        retryAfterSeconds: secondsUntil(user.loginLockedUntil),
      });
    }

    if (user.loginLockedUntil && user.loginLockedUntil <= new Date()) {
      user.loginLockedUntil = null;
      user.failedLoginAttempts = 0;
      await user.save();
    }

    // Older accounts may still have role Staff while their position is Master Staff.
    const loginRole =
      user.role === "masterStaff" || user.staffPosition === "Master Staff"
        ? "masterStaff"
        : user.role;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const [lockedUntil, ipRecord] = await Promise.all([
        recordAccountFailure(user),
        recordIpFailure(clientIp),
      ]);

      if (lockedUntil) {
        return res.status(423).json({
          code: "ACCOUNT_LOCKED",
          message: "Login locked.",
          retryAfterSeconds: secondsUntil(lockedUntil),
        });
      }

      if (ipRecord.blockedUntil) {
        return res.status(429).json({
          code: "IP_RATE_LIMITED",
          message: "Too many login attempts. Please try again later.",
          retryAfterSeconds: secondsUntil(ipRecord.blockedUntil),
        });
      }

      return res.status(401).json({ message: "Invalid email or password." });
    }

    await Promise.all([
      User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0, loginLockedUntil: null } },
      ),
      LoginAttempt.updateOne(
        { ip: clientIp },
        { $set: { failedAttempts: 0, blockedUntil: null, windowStartedAt: new Date() } },
      ),
    ]);

    if (loginRole === "Staff") {
      // Record the first successful staff login for the current day.
      const dateKey = new Date().toISOString().slice(0, 10);
      await Attendance.findOneAndUpdate(
        { userId: user._id, dateKey },
        {
          $setOnInsert: {
            userId: user._id,
            dateKey,
            status: "Present",
            checkIn: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    const token = jwt.sign(
      { userId: user._id, role: loginRole },
      config.jwtSecret,
      { expiresIn: "1d" },
    );

    setAuthCookie(res, token);

    res.json({
      user: {
        id: user._id,
        businessName: user.businessName,
        ownerName: user.ownerName,
        email: user.email,
        role: loginRole,
      },
    });
  } catch (err) {
    console.error("--- LOGIN ERROR DETAILS ---");
    console.error(err);
    console.error("---------------------------");
    res.status(500).json({ message: "Server error during login." });
  }
};

exports.logout = (req, res) => {
  clearAuthCookie(res);
  return res.json({ message: "Logged out successfully." });
};

exports.getSession = async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "businessName ownerName email role staffName staffPosition accountStatus",
  );

  if (!user || user.accountStatus === "Disabled") {
    clearAuthCookie(res);
    return res.status(401).json({ message: "Session is no longer valid." });
  }

  return res.json({
    user: {
      id: user._id,
      businessName: user.businessName,
      ownerName: user.ownerName,
      email: user.email,
      role:
        user.role === "masterStaff" || user.staffPosition === "Master Staff"
          ? "masterStaff"
          : user.role,
    },
  });
};

// Get the authenticated user's saved profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password -otp")
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user });
  } catch (err) {
    console.error("--- GET CURRENT USER ERROR DETAILS ---");
    console.error(err);
    console.error("---------------------------------------");
    res.status(500).json({ message: "Failed to retrieve user." });
  }
};
