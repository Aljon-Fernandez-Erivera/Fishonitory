const multer = require("multer");

const allowedMimeTypes = new Set(["image/jpeg", "image/png"]);

const uploadFishPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Only JPEG and PNG images are allowed."));
    }
    callback(null, true);
  },
}).single("photo");

const uploadErrorHandler = (error, req, res, next) => {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Image must be 3 MB or smaller." });
  }
  return res.status(400).json({ message: error.message || "Invalid image upload." });
};

module.exports = { uploadFishPhoto, uploadErrorHandler };
