const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const fishController = require("../controllers/fishController");
const { validateFish, validateId } = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
router.get("/", fishController.listFish);
router.post("/", validateFish, fishController.createFish);
router.patch("/:id", validateId("id"), validateFish, fishController.updateFish);
router.delete("/:id", validateId("id"), fishController.deleteFish);

module.exports = router;
