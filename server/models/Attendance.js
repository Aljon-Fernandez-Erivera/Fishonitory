const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    dateKey: {
      type: String,
      required: true,
    },
    
    status: {
      type: String,
      enum: ["Present", "Late", "Absent", "Leave", "DayOff"],
      default: "Present",
    },
   
    checkIn: {
      type: Date,
      default: null,
    },

    checkOut: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

attendanceSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
