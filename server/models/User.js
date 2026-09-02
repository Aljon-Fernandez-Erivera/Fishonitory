const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: [true, 'Business/Store name is required'],
      trim: true,
      minlength: [3, 'Business name must be at least 3 characters'],
      maxlength: [100, 'Business name cannot exceed 100 characters']
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
      minlength: [2, 'Owner name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters']
    },
    businessAddress: {
      type: String,
      required: [true, 'Business address is required'],
      trim: true,
      maxlength: [255, 'Business address cannot exceed 255 characters']
    },
    phoneNumber: {
      type: String, // Kept as String so leading zero (09...) and + symbols aren't stripped
      required: [true, 'Phone number is required'],
      trim: true,
      match: [
        /^(09|\+639)\d{9}$/,
        'Please enter a valid Philippine mobile number (e.g., 09123456789 or +639123456789)'
      ]
    },
    otp: {
      type: Number,
      required: [true, 'OTP verification is required']
    },
    role: {
      type: String,
      enum: ['Owner'], // Registration restricted strictly to store owners
      default: 'Owner'
    }
  },
  { timestamps: true }
);

// Hash password via bcrypt before saving to MongoDB Atlas
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
