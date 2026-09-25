const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
      // Must contain at least one non-whitespace char.
      // [\s\S] matches newlines, so multi-line notes pass.
      validate: {
        validator: (v) => typeof v === "string" && /\S/.test(v),
        message: "Note text cannot be blank.",
      },
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    isTask: { type: Boolean, default: false, index: true },
    taskStatus: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
      index: true,
    },
    completedBy: { type: String, trim: true, maxlength: 120, default: "" },
    resolved: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

noteSchema.index({ ownerId: 1, visibility: 1, pinned: -1, createdAt: -1 });

module.exports = mongoose.model("Note", noteSchema);