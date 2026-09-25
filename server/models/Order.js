const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessName: { type: String, required: true, trim: true, maxlength: 100 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        name: String,
        category: String,
        price: Number,
        costPrice: { type: Number, min: 0, default: 0 },
        quantity: Number,
        total: Number,
      },
    ],
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    customerEmail: { type: String, trim: true, lowercase: true, default: "" },
    customerPhone: { type: String, trim: true, default: "" },
    deliveryMethod: {
      type: String,
      enum: ["pickup", "rider", "courier"],
      required: true,
    },
    // Only meaningful when deliveryMethod is "courier" (e.g. "Lalamove", "Grab").
    courierName: { type: String, trim: true, maxlength: 80, default: "" },
    requestedDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    deliveryStatus: {
      type: String,
      enum: ["pending", "fulfilled"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
      index: true,
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", default: null },
    notificationSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ ownerId: 1, deliveryStatus: 1, paymentStatus: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);