const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomInt } = require("crypto");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const LoginAttempt = require("../models/LoginAttempt");
const config = require("../config/config");
const { cookieNameForRole } = require("../middleware/authMiddleware");
const { writeAudit } = require("../utils/audit");
const { getManilaDateKey } = require("../utils/dateKey");
const {
  buildOtpAuthUri,
  createRecoveryCodes,
  decryptSecret,
  encryptSecret,
  generateSecret,
  verifyCode,
} = require("../utils/totp");

// In-memory OTP storage
const pendingOTPs = new Map();
const pendingPasswordResets = new Map();
const pendingTotpResets = new Map();

//LOGIN limit, mag lo-lock once na reach ang 3 attempts ng 5 mins
const ACCOUNT_ATTEMPT_LIMIT = 3;
const ACCOUNT_LOCK_MS = 5 * 60 * 1000; //5mins

//IP LIMIT, mag lo-lock once na reach ang 10 attempts ng wrong passwords ng 15 mins lock login all users
const IP_ATTEMPT_LIMIT = 10; // 10 attempts
const IP_WINDOW_MS = 15 * 60 * 1000; //15mins
const IP_LOCK_MS = 15 * 60 * 1000; //15mins

//TOTP limit, totp limit ng 5 attempts
const TOTP_ATTEMPT_LIMIT = 5; // 5 attempt totp
const TOTP_LOCK_MS = 5 * 60 * 1000; 

function getClientIp(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function secondsUntil(date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

function setAuthCookie(res, token, role) {
  const sameSite = config.nodeEnv === "production" ? "None" : "Lax";
  const secure = config.nodeEnv === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", [
    `${cookieNameForRole(role)}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=86400; SameSite=${sameSite}${secure}`,
    `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}${secure}`,
  ]);
}

function clearAuthCookie(res, role) {
  const cookieName = cookieNameForRole(role) || "access_token";
  const sameSite = config.nodeEnv === "production" ? "None" : "Lax";
  const secure = config.nodeEnv === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}${secure}`,
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
    {
      $set: {
        blockedUntil: null,
        failedAttempts: 0,
        windowStartedAt: new Date(),
      },
    },
  );
  return null;
}

async function recordIpFailure(ip) {
  const now = new Date();
  let record = await LoginAttempt.findOne({ ip });

  if (
    !record ||
    now.getTime() - record.windowStartedAt.getTime() >= IP_WINDOW_MS
  ) {
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

async function recordTotpFailure(user) {
  const failedAttempts = (user.totpFailedAttempts || 0) + 1;
  const update = { totpFailedAttempts: failedAttempts };
  if (failedAttempts >= TOTP_ATTEMPT_LIMIT) {
    update.totpLockedUntil = new Date(Date.now() + TOTP_LOCK_MS);
  }
  await User.updateOne({ _id: user._id }, { $set: update });
  return update.totpLockedUntil || null;
}

function totpLockResponse(lockedUntil) {
  return {
    code: "TOTP_LOCKED",
    message: "Too many authenticator-code attempts. Please try again later.",
    retryAfterSeconds: secondsUntil(lockedUntil),
  };
}

async function completeLogin(req, res, user, loginRole) {
  const clientIp = getClientIp(req);
  await Promise.all([
    User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: 0,
          loginLockedUntil: null,
          totpFailedAttempts: 0,
          totpLockedUntil: null,
        },
      },
    ),
    LoginAttempt.updateOne(
      { ip: clientIp },
      {
        $set: {
          failedAttempts: 0,
          blockedUntil: null,
          windowStartedAt: new Date(),
        },
      },
    ),
  ]);

  let alreadyClockedIn = false;
  if (loginRole === "Staff") {
    const dateKey = getManilaDateKey();
    const existingRecord = await Attendance.findOne({
      userId: user._id,
      dateKey,
    });
    if (existingRecord) {
      alreadyClockedIn = true;
    } else {
      await Attendance.create({
        userId: user._id,
        dateKey,
        status: "Present",
        checkIn: new Date(),
      });
    }
  }

  const token = jwt.sign(
    { userId: user._id, role: loginRole },
    config.jwtSecret,
    { expiresIn: "1d" },
  );
  setAuthCookie(res, token, loginRole);
  return res.json({
    user: {
      id: user._id,
      businessName: user.businessName,
      ownerName: user.ownerName,
      email: user.email,
      role: loginRole,
    },
    alreadyClockedIn,
  });
}

async function verifyRecoveryCode(user, recoveryCode) {
  const normalized = String(recoveryCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-F0-9]{10}$/.test(normalized)) return false;
  const hashes = user.totpRecoveryCodeHashes || [];
  for (let index = 0; index < hashes.length; index += 1) {
    if (await bcrypt.compare(normalized, hashes[index])) {
      hashes.splice(index, 1);
      user.totpRecoveryCodeHashes = hashes;
      return true;
    }
  }
  return false;
}

// Brevo transactional email. This replaced Nodemailer/Gmail SMTP (Render
// blocks outbound SMTP ports on its free tier) and then Resend (its shared
// sender address only accepts recipients matching your own Resend account
// email until a domain is verified). Brevo's Single Sender Verification lets
// a plain Gmail address send to any recipient on the free tier, over a plain
// HTTPS POST -- no SMTP socket involved, so Render's port block never applies.
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM; // the Gmail address verified as a Sender in Brevo
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "Fishonitory";

async function sendEmail({ to, subject, html, text }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    let details;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    return { error: { status: response.status, details } };
  }
  return { error: null };
}

const buildCodeEmailHtml = ({ title, subtitle, code, helperText, footerText }) => `
  <div style="margin:0;padding:32px 16px;background:#edf7fb;font-family:Arial,Helvetica,sans-serif;color:#12314a;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #d8ebf3;border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 30px rgba(16, 76, 98, 0.08);">
      <div style="background:linear-gradient(135deg,#0d4a5f,#0a6c7d);padding:22px 28px;color:#ffffff;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.9;">Fishonitory</div>
        <div style="margin-top:8px;font-size:28px;font-weight:700;line-height:1.2;">${title}</div>
      </div>
      <div style="padding:28px 24px 20px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d5d6b;">${subtitle}</p>
        <div style="margin:18px 0 8px;text-align:center;padding:20px 16px;border-radius:12px;background:#f3fafb;border:1px solid #d4edf2;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#4d7b88;margin-bottom:10px;font-weight:700;">Your code</div>
          <div style="font-size:36px;letter-spacing:8px;font-weight:800;color:#0a4c63;">${code}</div>
        </div>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#496a76;">${helperText}</p>
      </div>
      <div style="padding:0 24px 24px;font-size:12px;color:#6b8591;">
        <div style="border-top:1px solid #e5edf1;padding-top:14px;">${footerText}</div>
      </div>
    </div>
  </div>
`;

// Send OTP muna
exports.sendOtp = async (req, res) => {
  try {
    const rawEmail = req.body.email;

    if (!rawEmail) {
      return res.status(400).json({ message: "Email is required." });
    }
    const email = rawEmail.trim().toLowerCase();

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const generatedOTP = randomInt(100000, 1000000);

    pendingOTPs.set(email, {
      otp: generatedOTP,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const { error: emailErr } = await sendEmail({
      to: email,
      subject: "Fishonitory - Registration Verification OTP",
      text: `Your Fishonitory verification code is ${generatedOTP}. It expires in 5 minutes.`,
      html: buildCodeEmailHtml({
        title: "Verify your account",
        subtitle: "Use the code below to continue creating your Fishonitory account.",
        code: String(generatedOTP).padStart(6, "0"),
        helperText: "This code will expire in 5 minutes. For your security, never share it with anyone.",
        footerText: "Fishonitory · Secure account verification",
      }),
    });

    if (emailErr) {
      console.error("Brevo failed to send the OTP email.");
      console.error("Email error:", emailErr);
      console.error(
        "Check BREVO_API_KEY and confirm EMAIL_FROM matches the address verified as a Sender in Brevo.",
      );
      return res.status(500).json({
        message:
          "We could not send the verification code right now. Please try again later.",
      });
    }
    res.json({
      message:
        "OTP has been sent to your email address. Please check your inbox or spam folder.",
    });
  } catch (err) {
    console.error("--- DB / OTP ERROR DETAILS ---");
    console.error(err);
    console.error("------------------------------");

    res.status(500).json({
      message:
        "We could not process your registration request. Please try again later.",
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
      return res.status(400).json({
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

    res.status(201).json({
      message: "OTP verified! Business Owner account successfully created.",
    });
  } catch (err) {
    console.error("--- VERIFY / REGISTER ERROR DETAILS ---");
    console.error(err);
    console.error("----------------------------------------");
    res
      .status(500)
      .json({
        message: "We could not create your account. Please try again later.",
      });
  }
};

// Send a password-reset code.
exports.requestPasswordReset = async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email })
      .select("_id accountStatus")
      .exec();

    if (user && user.accountStatus !== "Disabled") {
      const otp = randomInt(100000, 1000000);
      pendingPasswordResets.set(email, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      const { error: mailError } = await sendEmail({
        to: email,
        subject: "Fishonitory - Password Reset Code",
        text: `Your Fishonitory password reset code is ${otp}. It expires in 5 minutes. If you did not request this, you can ignore this email.`,
        html: buildCodeEmailHtml({
          title: "Reset your password",
          subtitle: "A password reset request was made for your Fishonitory account.",
          code: String(otp).padStart(6, "0"),
          helperText: "Use this code to continue with your password reset. If you did not request it, you can safely ignore this email.",
          footerText: "This reset code expires in 5 minutes.",
        }),
      });

      if (mailError) {
        pendingPasswordResets.delete(email);
        console.error(
          "Password-reset email could not be sent.",
          mailError,
        );
        return res
          .status(503)
          .json({
            message:
              "We could not send a reset code right now. Please try again later.",
          });
      }
    }

    return res.json({
      message:
        "If that email belongs to an active account, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Password-reset request failed.", error);
    return res
      .status(500)
      .json({
        message: "We could not process your request. Please try again later.",
      });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const code = String(req.body.otp || "");
    const pending = pendingPasswordResets.get(email);
    if (!pending || Date.now() > pending.expiresAt) {
      pendingPasswordResets.delete(email);
      return res
        .status(400)
        .json({
          message: "That reset code has expired. Please request a new one.",
        });
    }
    if (code !== String(pending.otp)) {
      return res
        .status(400)
        .json({ message: "That reset code is not correct. Please try again." });
    }

    const user = await User.findOne({ email }).select("+totpLockedUntil");
    if (!user || user.accountStatus === "Disabled") {
      pendingPasswordResets.delete(email);
      return res
        .status(400)
        .json({
          message:
            "This password cannot be reset right now. Please contact your business owner.",
        });
    }

    user.password = req.body.password;
    user.failedLoginAttempts = 0;
    user.loginLockedUntil = null;
    await user.save();
    pendingPasswordResets.delete(email);
    clearAuthCookie(res);
    return res.json({
      message: "Your password has been reset. You can now log in.",
    });
  } catch (error) {
    console.error("Password reset failed.", error);
    return res
      .status(500)
      .json({
        message: "We could not reset your password. Please try again later.",
      });
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
      await user.save({ validateBeforeSave: false });
    }

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

    if (!user.totpEnabled) {
      const enrollmentToken = jwt.sign(
        { userId: user._id, role: loginRole, purpose: "totp-enroll" },
        config.jwtSecret,
        { expiresIn: "10m" },
      );
      return res.json({ mfaEnrollmentRequired: true, enrollmentToken });
    }

    if (user.totpEnabled) {
      if (user.totpLockedUntil && user.totpLockedUntil > new Date()) {
        return res.status(423).json(totpLockResponse(user.totpLockedUntil));
      }
      const challengeToken = jwt.sign(
        { userId: user._id, role: loginRole, purpose: "totp-login" },
        config.jwtSecret,
        { expiresIn: "5m" },
      );
      return res.json({ totpRequired: true, challengeToken });
    }

    return completeLogin(req, res, user, loginRole);
  } catch (err) {
    console.error("--- LOGIN ERROR DETAILS ---");
    console.error(err);
    console.error("---------------------------");
    res.status(500).json({ message: "Server error during login." });
  }
};

exports.verifyTotpLogin = async (req, res) => {
  try {
    const { challengeToken, code, recoveryCode } = req.body || {};
    const challenge = jwt.verify(
      String(challengeToken || ""),
      config.jwtSecret,
    );
    if (challenge.purpose !== "totp-login") {
      return res
        .status(401)
        .json({ message: "Invalid login verification request." });
    }

    const user = await User.findById(challenge.userId).select(
      "+totpSecretCiphertext +totpRecoveryCodeHashes +totpLastUsedCounter +totpFailedAttempts +totpLockedUntil",
    );
    if (!user || user.accountStatus === "Disabled" || !user.totpEnabled) {
      return res
        .status(401)
        .json({ message: "This TOTP login request is no longer valid." });
    }
    if (user.totpLockedUntil && user.totpLockedUntil > new Date()) {
      return res.status(423).json(totpLockResponse(user.totpLockedUntil));
    }

    let verified = false;
    if (code) {
      const counter = verifyCode(
        decryptSecret(user.totpSecretCiphertext, config.totpEncryptionKey),
        code,
      );
      if (counter !== null && counter > user.totpLastUsedCounter) {
        user.totpLastUsedCounter = counter;
        verified = true;
      }
    } else if (recoveryCode) {
      verified = await verifyRecoveryCode(user, recoveryCode);
    }

    if (!verified) {
      const lockedUntil = await recordTotpFailure(user);
      if (lockedUntil)
        return res.status(423).json(totpLockResponse(lockedUntil));
      return res
        .status(401)
        .json({ message: "Invalid or already used authenticator code." });
    }

    await user.save({ validateBeforeSave: false });
    return completeLogin(req, res, user, challenge.role);
  } catch (error) {
    return res
      .status(401)
      .json({
        message: "The login verification expired. Please sign in again.",
      });
  }
};

exports.startTotpReset = async (req, res) => {
  try {
    const challenge = jwt.verify(
      String(req.body?.challengeToken || ""),
      config.jwtSecret,
    );
    if (challenge.purpose !== "totp-login")
      throw new Error("Invalid reset request.");
    const user = await User.findById(challenge.userId).select(
      "email accountStatus totpEnabled",
    );
    if (!user || user.accountStatus === "Disabled" || !user.totpEnabled) {
      return res
        .status(401)
        .json({ message: "This reset request is no longer valid." });
    }
    const code = randomInt(100000, 1000000);
    pendingTotpResets.set(String(user._id), {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      role: challenge.role,
    });

    const { error: sendErr } = await sendEmail({
      to: user.email,
      subject: "Fishonitory - Authenticator Reset Code",
      text: `Your authenticator reset code is ${code}. It expires in 5 minutes. If you did not request this, change your password immediately.`,
      html: buildCodeEmailHtml({
        title: "Recover your authenticator",
        subtitle: "Use the code below to reset your Fishonitory authenticator setup.",
        code: String(code).padStart(6, "0"),
        helperText: "This code expires in 5 minutes. If you did not request this reset, change your password immediately.",
        footerText: "Fishonitory security notice",
      }),
    });
    if (sendErr) {
      console.error("MFA reset email failed to send:", sendErr);
      return res
        .status(500)
        .json({ message: "We could not send the reset code. Please try again." });
    }
    return res.json({
      message: "A reset code was sent to your account email.",
    });
  } catch (error) {
    console.error("MFA reset request failed:", error.message);
    return res
      .status(400)
      .json({
        message:
          "We could not start authenticator reset. Please sign in again.",
      });
  }
};

exports.confirmTotpReset = async (req, res) => {
  try {
    const challenge = jwt.verify(
      String(req.body?.challengeToken || ""),
      config.jwtSecret,
    );
    if (challenge.purpose !== "totp-login")
      throw new Error("Invalid reset request.");
    const pending = pendingTotpResets.get(String(challenge.userId));
    if (
      !pending ||
      pending.expiresAt <= Date.now() ||
      String(req.body?.code || "") !== String(pending.code)
    ) {
      return res
        .status(400)
        .json({ message: "That reset code is invalid or expired." });
    }
    pendingTotpResets.delete(String(challenge.userId));
    await User.updateOne(
      { _id: challenge.userId },
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
    const enrollmentToken = jwt.sign(
      {
        userId: challenge.userId,
        role: challenge.role,
        purpose: "totp-enroll",
      },
      config.jwtSecret,
      { expiresIn: "10m" },
    );
    return res.json({ mfaEnrollmentRequired: true, enrollmentToken });
  } catch (error) {
    return res
      .status(400)
      .json({
        message: "We could not reset your authenticator. Please sign in again.",
      });
  }
};

exports.getTotpStatus = async (req, res) => {
  const user = await User.findById(req.user.userId).select("totpEnabled");
  return res.json({ enabled: Boolean(user?.totpEnabled) });
};

exports.cancelTotpSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "+totpSetupCiphertext +totpSetupExpiresAt totpEnabled",
    );
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (user.totpEnabled)
      return res
        .status(400)
        .json({ message: "MFA is already enabled and cannot be cancelled." });
    user.totpSetupCiphertext = "";
    user.totpSetupExpiresAt = null;
    await user.save({ validateBeforeSave: false });
    return res.json({ message: "Authenticator setup cancelled." });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "We could not cancel authenticator setup. Please try again.",
      });
  }
};

exports.startRequiredTotpEnrollment = async (req, res) => {
  try {
    const challenge = jwt.verify(
      String(req.body?.enrollmentToken || ""),
      config.jwtSecret,
    );
    if (challenge.purpose !== "totp-enroll")
      throw new Error("Invalid enrollment request.");
    const user = await User.findById(challenge.userId).select(
      "+totpSetupCiphertext +totpSetupExpiresAt",
    );
    if (!user || user.accountStatus === "Disabled")
      return res
        .status(401)
        .json({ message: "This enrollment request is no longer valid." });
    if (!user.totpEnabled) {
      const secret = generateSecret();
      user.totpSetupCiphertext = encryptSecret(
        secret,
        config.totpEncryptionKey,
      );
      user.totpSetupExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save({ validateBeforeSave: false });
    }
    const secret = decryptSecret(
      user.totpSetupCiphertext,
      config.totpEncryptionKey,
    );
    const label = `${user.businessName || user.staffName || "Fishonitory"}:${user.email}`;
    return res.json({
      otpauthUri: buildOtpAuthUri(secret, label),
      manualKey: secret,
      expiresInSeconds: 600,
    });
  } catch (error) {
    return res
      .status(401)
      .json({
        message: "The MFA enrollment request expired. Please sign in again.",
      });
  }
};

exports.confirmRequiredTotpEnrollment = async (req, res) => {
  try {
    const challenge = jwt.verify(
      String(req.body?.enrollmentToken || ""),
      config.jwtSecret,
    );
    if (challenge.purpose !== "totp-enroll")
      throw new Error("Invalid enrollment request.");
    const user = await User.findById(challenge.userId).select(
      "+totpSetupCiphertext +totpSetupExpiresAt +totpRecoveryCodeHashes",
    );
    if (
      !user?.totpSetupCiphertext ||
      !user.totpSetupExpiresAt ||
      user.totpSetupExpiresAt <= new Date()
    ) {
      return res
        .status(400)
        .json({ message: "Your MFA setup has expired. Please sign in again." });
    }
    const secret = decryptSecret(
      user.totpSetupCiphertext,
      config.totpEncryptionKey,
    );
    const counter = verifyCode(secret, req.body?.code, 1);
    if (counter === null)
      return res
        .status(400)
        .json({ message: "Enter the current 6-digit authenticator code." });
    const recoveryCodes = createRecoveryCodes();
    user.totpEnabled = true;
    user.totpSecretCiphertext = encryptSecret(secret, config.totpEncryptionKey);
    user.totpSetupCiphertext = "";
    user.totpSetupExpiresAt = null;
    user.totpLastUsedCounter = counter;
    user.totpRecoveryCodeHashes = await Promise.all(
      recoveryCodes.map((value) => bcrypt.hash(value, 10)),
    );
    await user.save({ validateBeforeSave: false });
    const auditRequest = Object.create(req);
    auditRequest.user = { userId: user._id, role: challenge.role };
    await writeAudit(
      auditRequest,
      "ENABLE",
      "TOTP",
      user._id,
      "MFA enrollment completed.",
    );
    return completeLogin(req, res, user, challenge.role);
  } catch (error) {
    console.error("MFA enrollment confirmation failed:", error.message);
    return res
      .status(401)
      .json({
        message:
          "MFA enrollment could not be completed. Please sign in again and try a new current code.",
      });
  }
};

exports.startTotpSetup = async (req, res) => {
  try {
    if (req.user.role !== "Owner")
      return res
        .status(403)
        .json({ message: "TOTP is available to owner accounts only." });
    const user = await User.findById(req.user.userId).select(
      "+totpSetupCiphertext +totpSetupExpiresAt",
    );
    if (!user || user.totpEnabled)
      return res
        .status(400)
        .json({ message: "TOTP is already enabled for this account." });

    const secret = generateSecret();
    user.totpSetupCiphertext = encryptSecret(secret, config.totpEncryptionKey);
    user.totpSetupExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    const label = `${user.businessName || "Fishonitory"}:${user.email}`;
    return res.json({
      otpauthUri: buildOtpAuthUri(secret, label),
      manualKey: secret,
      expiresInSeconds: 600,
    });
  } catch (error) {
    console.error("TOTP setup could not be started.", error.message);
    return res
      .status(500)
      .json({ message: "We could not start TOTP setup. Please try again." });
  }
};

exports.confirmTotpSetup = async (req, res) => {
  try {
    if (req.user.role !== "Owner")
      return res
        .status(403)
        .json({ message: "TOTP is available to owner accounts only." });
    const user = await User.findById(req.user.userId).select(
      "+totpSetupCiphertext +totpSetupExpiresAt +totpRecoveryCodeHashes",
    );
    if (
      !user?.totpSetupCiphertext ||
      !user.totpSetupExpiresAt ||
      user.totpSetupExpiresAt <= new Date()
    ) {
      return res
        .status(400)
        .json({ message: "This TOTP setup has expired. Start setup again." });
    }
    const secret = decryptSecret(
      user.totpSetupCiphertext,
      config.totpEncryptionKey,
    );
    const counter = verifyCode(secret, req.body?.code, 1);
    if (counter === null)
      return res
        .status(400)
        .json({ message: "Enter the current 6-digit authenticator code." });

    const recoveryCodes = createRecoveryCodes();
    user.totpEnabled = true;
    user.totpSecretCiphertext = encryptSecret(secret, config.totpEncryptionKey);
    user.totpSetupCiphertext = "";
    user.totpSetupExpiresAt = null;
    user.totpLastUsedCounter = counter;
    user.totpRecoveryCodeHashes = await Promise.all(
      recoveryCodes.map((value) => bcrypt.hash(value, 10)),
    );
    await user.save();
    await writeAudit(
      req,
      "ENABLE",
      "TOTP",
      user._id,
      "Owner enabled TOTP authentication.",
    );
    return res.json({
      message: "Authenticator app verified. Save your recovery codes now.",
      recoveryCodes,
    });
  } catch (error) {
    console.error("TOTP setup confirmation failed.", error.message);
    return res
      .status(500)
      .json({ message: "We could not confirm TOTP setup. Please try again." });
  }
};

exports.disableTotp = async (req, res) => {
  try {
    return res
      .status(403)
      .json({
        message: "MFA is required for all accounts and cannot be disabled.",
      });
    if (req.user.role !== "Owner")
      return res
        .status(403)
        .json({ message: "TOTP is available to owner accounts only." });
    const user = await User.findById(req.user.userId).select(
      "+totpSecretCiphertext +totpRecoveryCodeHashes +totpLastUsedCounter",
    );
    if (!user?.totpEnabled)
      return res
        .status(400)
        .json({ message: "TOTP is not enabled for this account." });
    if (
      !(await bcrypt.compare(String(req.body?.password || ""), user.password))
    ) {
      return res.status(401).json({ message: "Your password is not correct." });
    }

    const counter = verifyCode(
      decryptSecret(user.totpSecretCiphertext, config.totpEncryptionKey),
      req.body?.code,
      1,
    );
    const verified =
      counter !== null && counter > user.totpLastUsedCounter
        ? ((user.totpLastUsedCounter = counter), true)
        : await verifyRecoveryCode(user, req.body?.recoveryCode);
    if (!verified)
      return res
        .status(401)
        .json({ message: "Enter a current authenticator or recovery code." });

    user.totpEnabled = false;
    user.totpSecretCiphertext = "";
    user.totpSetupCiphertext = "";
    user.totpSetupExpiresAt = null;
    user.totpRecoveryCodeHashes = [];
    user.totpLastUsedCounter = -1;
    user.totpFailedAttempts = 0;
    user.totpLockedUntil = null;
    await user.save();
    await writeAudit(
      req,
      "DISABLE",
      "TOTP",
      user._id,
      "Owner disabled TOTP authentication.",
    );
    return res.json({ message: "TOTP has been disabled." });
  } catch (error) {
    console.error("TOTP disable failed.", error.message);
    return res
      .status(500)
      .json({ message: "We could not disable TOTP. Please try again." });
  }
};

exports.logout = (req, res) => {
  clearAuthCookie(res, req.headers["x-session-role"]);
  return res.json({ message: "Logged out successfully." });
};

exports.getSession = async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "businessName ownerName businessAddress phoneNumber email role staffName staffPosition accountStatus",
  );

  if (!user || user.accountStatus === "Disabled") {
    clearAuthCookie(res, req.headers["x-session-role"]);
    return res.status(401).json({ message: "Session is no longer valid." });
  }

  return res.json({
    user: {
      id: user._id,
      businessName: user.businessName,
      ownerName: user.ownerName,
      businessAddress: user.businessAddress,
      phoneNumber: user.phoneNumber,
      email: user.email,
      staffName: user.staffName,
      staffPosition: user.staffPosition,
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