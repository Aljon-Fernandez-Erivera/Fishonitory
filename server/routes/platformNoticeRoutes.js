const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const controller = require("../controllers/platformNoticeController");

const router = express.Router();
router.use(authMiddleware, requireRole(["Owner", "Staff", "masterStaff"]));
router.get("/", controller.listForOwner);
router.patch("/:id/dismiss", controller.dismiss);

module.exports = router;
