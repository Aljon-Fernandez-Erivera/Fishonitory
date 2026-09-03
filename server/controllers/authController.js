const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const config = require('../config/config');

// In-memory OTP storage
const pendingOTPs = new Map();

// Helper function to create Nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send OTP muna
exports.sendOtp = async (req, res) => {
  try {
    const rawEmail = req.body.email;

//check kung may email sa request
    if (!rawEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    const email = rawEmail.trim().toLowerCase();

    //check kung email ay gamit na ng iba
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Generate 6-digit integer OTP
    const generatedOTP = Math.floor(100000 + Math.random() * 900000);

    // Save in memory tas mag expire ng 5 mins 
    pendingOTPs.set(email, {
      otp: generatedOTP,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`\n=================================================`);
    console.log(`[OTP LOG] Code for ${email}: ${generatedOTP}`);
    console.log(`=================================================\n`);

    // Try sending email via Nodemailer
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Fishonitory" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Fishonitory - Registration Verification OTP',
        text: `Your 6-digit verification code is: ${generatedOTP}. This code will expire in 5 minutes.`
      });
    } catch (emailErr) {
      console.error('Nodemailer failed to send the OTP email.');
      console.error('Email error:', emailErr.message || emailErr);
      console.error('Check EMAIL_USER / EMAIL_PASS, and make sure Gmail App Passwords are being used.');
      return res.status(500).json({
        message: 'OTP was generated, but the email could not be sent. Check the backend console for the mail error.'
      });
    }
//message confirmation once successful na generate and send ng OTP at nasend sa email
    res.json({ message: 'OTP has been sent to your email address. Please check your inbox or spam folder.' });
//nasa RegisterBusinessPage.jsx yung error handling kung may error sa backend.

  } catch (err) {
    console.error('--- DB / OTP ERROR DETAILS ---');
    console.error(err);
    console.error('------------------------------');

    res.status(500).json({ 
      message: 'Database query failed. Check the backend console for details.', 
      error: err.message 
    });
  }
};

// Verify OTP and Register
exports.verifyAndRegister = async (req, res) => {
  try {
    const { businessName, ownerName, password, businessAddress, phoneNumber, otp } = req.body;
    const email = req.body.email.trim().toLowerCase();

    const record = pendingOTPs.get(email);
    if (!record) {
      return res.status(400).json({ message: 'No pending OTP requested for this email or it has expired.' });
    }

    if (Date.now() > record.expiresAt) {
      pendingOTPs.delete(email);
      return res.status(400).json({ message: 'OTP code has expired. Please request a new one.' });
    }

    if (parseInt(otp, 10) !== record.otp) {
      return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    }

    const newUser = new User({
      businessName,
      ownerName,
      email,
      password,
      businessAddress,
      phoneNumber,
      otp: record.otp,
      role: 'Owner'
    });

    await newUser.save();
    pendingOTPs.delete(email);

    res.status(201).json({ message: 'OTP verified! Business Owner account successfully created.' });
  } catch (err) {
    console.error('--- VERIFY / REGISTER ERROR DETAILS ---');
    console.error(err);
    console.error('----------------------------------------');
    res.status(500).json({ message: err.message || 'Server error during registration.' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    const rawEmail = req.body.email;

    if (!rawEmail || !password) {
      return res.status(400).json({ message: 'Please enter both email and password.' });
    }
    const email = rawEmail.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    if (user.accountStatus === 'Disabled') {
      return res.status(403).json({ message: 'This account has been disabled.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (user.role === 'Staff') {
      // Record the first successful staff login for the current day.
      const dateKey = new Date().toISOString().slice(0, 10);
      await Attendance.findOneAndUpdate(
        { userId: user._id, dateKey },
        {
          $setOnInsert: {
            userId: user._id,
            dateKey,
            status: 'Present',
            checkIn: new Date()
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        businessName: user.businessName,
        ownerName: user.ownerName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('--- LOGIN ERROR DETAILS ---');
    console.error(err);
    console.error('---------------------------');
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// Get the authenticated user's saved profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -otp')
      .exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('--- GET CURRENT USER ERROR DETAILS ---');
    console.error(err);
    console.error('---------------------------------------');
    res.status(500).json({ message: 'Failed to retrieve user.' });
  }
};
