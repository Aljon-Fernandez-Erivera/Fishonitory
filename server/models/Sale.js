const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    soldBy: {
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
    customerName: { type: String, trim: true, maxlength: 120, default: "Walk-in Customer" },
    customerEmail: { type: String, trim: true, lowercase: true, default: "" },
    customerPhone: { type: String, trim: true, default: "" },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Sale", saleSchema);