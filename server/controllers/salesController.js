const Sale = require("../models/Sale");
const Fish = require("../models/Fish");
const User = require("../models/User");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");

exports.listSales = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role)) {
    return res.status(403).json({ message: 'This account cannot view sales.' });
  }
  const ownerId = await getOwnerId(req);
  if (!ownerId)
    return res.status(404).json({ message: "Owner account not found." });
  const sales = await Sale.find({ ownerId })
    .populate("ownerId", "businessName ownerName")
    .populate("soldBy", "ownerName staffName staffPosition")
    .sort({ createdAt: -1 });
  return res.json({ sales });
};

exports.createSale = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role))
    return res
      .status(403)
      .json({ message: "This account cannot create sales." });
  const ownerId = await getOwnerId(req);
  const owner = await User.findById(ownerId).select("businessName");
  const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
  const discount = Math.max(0, Number(req.body.discount) || 0);
  if (!ownerId || !owner?.businessName || !requestedItems.length)
    return res
      .status(400)
      .json({ message: "Cart must contain at least one item." });

  const items = [];
  const changed = [];
  try {
    for (const requested of requestedItems) {
      const quantity = Math.floor(Number(requested.quantity));
      if (!requested.itemId || quantity < 1)
        throw new Error("Each item must have a valid quantity.");
      const item = await Fish.findOneAndUpdate(
        { _id: requested.itemId, ownerId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true },
      );
      if (!item)
        throw new Error(
          `Not enough stock for ${requested.name || "an inventory item"}.`,
        );
      changed.push({ id: item._id, quantity });
      const price = Number(item.price) || 0;
      items.push({
        itemId: item._id,
        name: item.name,
        category: item.category || "Fish",
        price,
        costPrice: Number(item.costPrice) || 0,
        quantity,
        total: price * quantity,
      });
    }
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const sale = await Sale.create({
      ownerId,
      businessName: owner.businessName,
      soldBy: req.user.userId,
      items,
      subtotal,
      discount: Math.min(discount, subtotal),
      total: subtotal - Math.min(discount, subtotal),
    });
    await writeAudit(req, "CREATE", "Sale", sale._id, `Sale total ${sale.total}`);
    return res
      .status(201)
      .json({ message: "Sale completed successfully.", sale });
  } catch (error) {
    await Promise.all(
      changed.map((item) =>
        Fish.findByIdAndUpdate(item.id, { $inc: { quantity: item.quantity } }),
      ),
    );
    return res
      .status(400)
      .json({ message: error.message || "Sale could not be completed." });
  }
};
