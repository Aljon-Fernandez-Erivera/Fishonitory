const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    supplierName: { type: String, required: true, trim: true, maxlength: 120 },
    supplierContact: { type: String, trim: true, maxlength: 120, default: "" },
    invoiceNumber: { type: String, trim: true, maxlength: 80, default: "" },
    purchasedAt: { type: Date, required: true, default: Date.now },
    items: [{
      fishId: { type: mongoose.Schema.Types.ObjectId, ref: "Fish", required: true },
      name: { type: String, required: true, trim: true },
      quantity: { type: Number, required: true, min: 1 },
      unitCost: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
    }],
    totalCost: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Purchase", purchaseSchema);
