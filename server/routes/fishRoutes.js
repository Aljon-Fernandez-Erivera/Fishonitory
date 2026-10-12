const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const fishController = require("../controllers/fishController");
const { validateFish, validateId } = require("../middleware/requestValidators");
const { uploadFishPhoto, uploadErrorHandler } = require("../middleware/fishPhotoUpload");
const sanitizeRequestBody = require("../middleware/sanitizeRequestBody");

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole(["Owner", "masterStaff"]));
router.get("/", fishController.listFish);
router.post("/photo", uploadFishPhoto, uploadErrorHandler, sanitizeRequestBody, fishController.uploadPhoto);
router.post("/", validateFish, fishController.createFish);
router.patch("/:id", validateId("id"), validateFish, fishController.updateFish);
// Stock corrections (count fixes) with a required reason.
router.patch("/:id/adjust", validateId("id"), fishController.adjustStock);
router.delete("/:id", validateId("id"), fishController.deleteFish);

module.exports = router;
