const mongoose = require("mongoose");

function normalizeBenefitItems(items = []) {
  return (items || []).map((item) => {
    const normalized = { ...item };
    if (!normalized.type) {
      normalized.type = "deduction";
    }
    if (normalized.amount !== undefined && normalized.amount !== null && normalized.amount !== "") {
      normalized.amount = Number(normalized.amount);
    }
    return normalized;
  });
}

const payrollSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staffName: { type: String, required: true, trim: true },
    period: { type: String, required: true },
    periodType: {
      type: String,
      enum: ["weekly", "fifteenDays", "monthly"],
      required: true,
      default: "monthly",
    },
    periodStart: { type: String, required: true },
    periodEnd: { type: String, required: true },
    dailyRate: { type: Number, required: true, min: 0 },
    presentDays: { type: Number, required: true, min: 0 },
    lateDays: { type: Number, required: true, min: 0 },
    payableDays: { type: Number, required: true, min: 0 },
    baseGross: { type: Number, required: true, min: 0, default: 0 },
    benefits: { type: Number, required: true, min: 0, default: 0 },
    benefitItems: [{
      name: { type: String, required: true, trim: true, maxlength: 80 },
      amount: { type: Number, required: true, min: 0 },
      type: { type: String, enum: ["addition", "deduction"], required: true },
    }],
    deductions: { type: Number, required: true, min: 0, default: 0 },
    grossPay: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

payrollSchema.pre("save", async function () {
  if (Array.isArray(this.benefitItems)) {
    this.benefitItems = normalizeBenefitItems(this.benefitItems);
  }
});

payrollSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], async function () {
  const update = this.getUpdate ? this.getUpdate() : this._update;
  if (update && Array.isArray(update.benefitItems)) {
    update.benefitItems = normalizeBenefitItems(update.benefitItems);
  }
});

payrollSchema.statics.backfillMissingBenefitTypes = async function () {
  const docs = await this.find({ "benefitItems.0": { $exists: true } });

  for (const doc of docs) {
    const originalItems = Array.isArray(doc.benefitItems) ? doc.benefitItems : [];
    const migratedItems = normalizeBenefitItems(originalItems);

    const changed = migratedItems.some((item, index) => {
      const current = originalItems[index] || {};
      return item.type !== current.type || Number(item.amount) !== Number(current.amount || 0);
    });

    if (changed) {
      doc.benefitItems = migratedItems;
      await doc.save();
    }
  }
};

payrollSchema.index(
  { ownerId: 1, staffId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);

module.exports = mongoose.model("Payroll", payrollSchema);