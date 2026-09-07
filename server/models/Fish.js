const mongoose = require("mongoose");

const fishSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    species: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "Fish" },
    tankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tank",
      default: null,
    },
    price: { type: Number, required: true, min: 0, default: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: "" },
    photoUrl: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Fish", fishSchema);
