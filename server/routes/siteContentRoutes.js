const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const controller = require("../controllers/siteContentController");

const router = express.Router();
router.get("/", controller.getSiteContent);
router.patch("/", authMiddleware, requireRole(["superAdmin"]), controller.updateSiteContent);

module.exports = router;
