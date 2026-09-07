const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const salesController = require("../controllers/salesController");
const { validateSale } = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
router.get("/", salesController.listSales);
router.post("/", validateSale, salesController.createSale);

module.exports = router;
