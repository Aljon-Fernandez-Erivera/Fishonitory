const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const controller = require("../controllers/platformNoticeController");

const router = express.Router();
router.use(authMiddleware, requireRole(["Owner"]));
router.get("/", controller.listForOwner);

module.exports = router;
