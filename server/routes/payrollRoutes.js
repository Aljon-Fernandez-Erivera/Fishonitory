const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const payrollController = require("../controllers/payrollController");
const { validateId } = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
router.get("/", payrollController.listPayroll);
router.post("/", payrollController.savePayroll);
router.delete("/:id", validateId("id"), payrollController.deletePayroll);

module.exports = router;
