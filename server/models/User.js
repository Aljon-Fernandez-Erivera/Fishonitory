const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: function () { return this.role === 'Owner'; },
      trim: true,
      minlength: [3, 'Business name must be at least 3 characters'],
      maxlength: [100, 'Business name cannot exceed 100 characters']
    },
    ownerName: {
      type: String,
      required: function () { return this.role === 'Owner'; },
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
      required: function () { return this.role === 'Owner'; },
      trim: true,
      maxlength: [255, 'Business address cannot exceed 255 characters']
    },
    phoneNumber: {
      type: String, // Stored as digits with the selected international country code
      required: [true, 'Phone number is required'],
      trim: true,
      match: [
        /^\d{7,15}$/,
        'Please enter a valid international phone number containing 7 to 15 digits'
      ]
    },
    otp: {
      type: Number,
      required: [true, 'OTP verification is required']
    },
    staffName: {
      type: String,
      trim: true,
      minlength: 2,
      required: function () { return this.role === 'Staff'; }
    },
    staffPosition: {
      type: String,
      trim: true,
      minlength: 2,
      required: function () { return this.role === 'Staff'; }
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () { return this.role === 'Staff'; }
    },
    accountStatus: {
      type: String,
      enum: ['Active', 'Disabled'],
      default: 'Active'
    },
    role: {
      type: String,
      enum: ['Owner', 'Staff'],
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
