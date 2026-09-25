const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const storeController = require("../controllers/storeController");
const { validateId, validateTank } = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole(["Owner", "masterStaff"]));
router.get("/tanks", storeController.listTanks);
router.post("/tanks", validateTank, storeController.createTank);
router.patch(
  "/tanks/:id",
  validateId("id"),
  validateTank,
  storeController.updateTank,
);
router.delete("/tanks/:id", validateId("id"), storeController.deleteTank);

module.exports = router;
