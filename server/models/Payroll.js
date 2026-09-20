const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    staffName: { type: String, required: true, trim: true },
    period: { type: String, required: true },
    periodType: { type: String, enum: ["weekly", "fifteenDays", "monthly"], required: true, default: "monthly" },
    periodStart: { type: String, required: true },
    periodEnd: { type: String, required: true },
    dailyRate: { type: Number, required: true, min: 0 },
    presentDays: { type: Number, required: true, min: 0 },
    lateDays: { type: Number, required: true, min: 0 },
    payableDays: { type: Number, required: true, min: 0 },
    benefits: { type: Number, required: true, min: 0, default: 0 },
    benefitItems: [{ name: { type: String, required: true, trim: true, maxlength: 80 }, amount: { type: Number, required: true, min: 0 } }],
    deductions: { type: Number, required: true, min: 0, default: 0 },
    grossPay: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

payrollSchema.index({ ownerId: 1, staffId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

module.exports = mongoose.model("Payroll", payrollSchema);
