const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authorization");
const orderController = require("../controllers/orderController");
const {
  validateOrderCreate,
  validateOrderUpdate,
  validateObjectIdParam,
} = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole(["Owner", "masterStaff"]));

router.get("/", orderController.listOrders);
router.post("/", validateOrderCreate, orderController.createOrder);
router.patch("/:id", validateObjectIdParam("id"), validateOrderUpdate, orderController.updateOrderStatus);
router.delete("/:id", validateObjectIdParam("id"), orderController.cancelOrder);

module.exports = router;