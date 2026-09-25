const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const salesController = require("../controllers/salesController");
const { validateSale, validateSaleUpdate, validateId } = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole(["Owner", "masterStaff", "Staff"]));
router.get("/", salesController.listSales);
router.post("/", validateSale, salesController.createSale);
router.patch("/:id", validateId("id"), validateSaleUpdate, salesController.updateSaleStatus);

module.exports = router;
