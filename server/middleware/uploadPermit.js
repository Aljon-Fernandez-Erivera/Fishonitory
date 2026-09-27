const multer = require("multer");

// Business permits are commonly either a photographed JPEG/PNG or a scanned
// PDF, so both are accepted here (unlike inventory photos, which are always
// JPEG/PNG since they're uploaded straight from a phone camera).
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

const uploadBusinessPermit = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 20 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Only JPEG, PNG, or PDF files are allowed for the business permit."));
    }
    callback(null, true);
  },
}).single("businessPermit");

const uploadErrorHandler = (error, req, res, next) => {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "The business permit file must be 8 MB or smaller." });
  }
  return res.status(400).json({ message: error.message || "Invalid file upload." });
};

module.exports = { uploadBusinessPermit, uploadErrorHandler };