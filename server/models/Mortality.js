const mongoose = require("mongoose");

const mortalitySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fishId: { type: mongoose.Schema.Types.ObjectId, ref: "Fish", required: true },
    tankId: { type: mongoose.Schema.Types.ObjectId, ref: "Tank", required: true },
    fishName: { type: String, required: true, trim: true },
    species: { type: String, required: true, trim: true },
    lifeStage: {
      type: String,
      enum: ["Fry", "Juvenile", "Adult", "Broodstock"],
      required: true,
    },
    batchNumber: { type: String, trim: true, maxlength: 100, default: "" },
    initialStockCount: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 },
    suspectedCause: {
      type: String,
      enum: [
        "Disease",
        "Water quality",
        "Handling stress",
        "Transport",
        "Predation",
        "Cannibalism",
        "Unknown",
      ],
      required: true,
    },
    signsObserved: [{
      type: String,
      enum: ["Lethargy", "White spots", "Fin rot", "Gasping", "Red patches"],
    }],
    treatmentGiven: { type: String, trim: true, maxlength: 200, default: "None" },
    disposalMethod: {
      type: String,
      enum: ["Burial", "Incineration", "Composting"],
      required: true,
    },
    photoUrl: { type: String, trim: true, default: "" },
    remarks: { type: String, trim: true, maxlength: 1000, default: "" },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    recordedAt: { type: Date, required: true, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Mortality", mortalitySchema);
