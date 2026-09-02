const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User'); // REQUIRED IMPORT
const config = require('../config/config');

// In-memory OTP storage
const pendingOTPs = new Map();

// Helper function to create Nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// 1. Step 1: Send OTP
exports.sendOtp = async (req, res) => {
  try {
    const rawEmail = req.body.email;

    if (!rawEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    const email = rawEmail.trim().toLowerCase();

    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Generate 6-digit integer OTP
    const generatedOTP = Math.floor(100000 + Math.random() * 900000);

    // Save in memory (expires in 5 mins)
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
      console.warn('Nodemailer failed to send email. Check EMAIL_USER/EMAIL_PASS in .env. OTP is logged in console.');
    }

    res.json({ message: 'OTP successfully generated.' });
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

// 2. Step 2: Verify OTP and Register
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

// 3. Step 3: Login
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
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

// 4. Get the authenticated user's saved profile
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
