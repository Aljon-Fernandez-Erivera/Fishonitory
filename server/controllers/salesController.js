const Sale = require("../models/Sale");
const Fish = require("../models/Fish");
const User = require("../models/User");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");
const mongoose = require("mongoose");

async function withTransaction(work) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      lastError = error;
      if (!error.hasErrorLabel?.("TransientTransactionError")) throw error;
    } finally {
      await session.endSession();
    }
  }
  throw lastError;
}

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
  const customerName = String(req.body.customerName || "").trim() || "Walk-in Customer";
  const customerEmail = String(req.body.customerEmail || "").trim();
  const customerPhone = String(req.body.customerPhone || "").trim();
  if (!ownerId || !owner?.businessName || !requestedItems.length)
    return res
      .status(400)
      .json({ message: "Cart must contain at least one item." });

  try {
    const sale = await withTransaction(async (session) => {
      const items = [];
      for (const requested of requestedItems) {
        const quantity = Math.floor(Number(requested.quantity));
        if (!requested.itemId || quantity < 1) throw new Error("Each item must have a valid quantity.");
        const item = await Fish.findOneAndUpdate(
          { _id: requested.itemId, ownerId, quantity: { $gte: quantity } },
          { $inc: { quantity: -quantity } },
          { new: true, session },
        );
        if (!item) throw new Error(`Not enough stock for ${requested.name || "an inventory item"}.`);
        const price = Number(item.price) || 0;
        items.push({ itemId: item._id, name: item.name, category: item.category || "Fish", price, costPrice: Number(item.costPrice) || 0, quantity, total: price * quantity });
      }
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const [created] = await Sale.create([{
        ownerId,
        businessName: owner.businessName,
        soldBy: req.user.userId,
        customerName,
        customerEmail,
        customerPhone,
        items,
        subtotal,
        discount: Math.min(discount, subtotal),
        total: subtotal - Math.min(discount, subtotal),
      }], { session });
      return created;
    });
    await writeAudit(req, "CREATE", "Sale", sale._id, `Sale total ${sale.total}`);
    return res
      .status(201)
      .json({ message: "Sale completed successfully.", sale });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Sale could not be completed." });
  }
};

exports.updateSaleStatus = async (req, res) => {
  if (!['Owner', 'masterStaff', 'Staff'].includes(req.user.role)) {
    return res.status(403).json({ message: "This account cannot update sales." });
  }

  const ownerId = await getOwnerId(req);
  const sale = await Sale.findOne({ _id: req.params.id, ownerId }).lean();
  if (!sale) {
    return res.status(404).json({ message: "Sale not found." });
  }

  const updated = await Sale.findOneAndUpdate(
    { _id: sale._id, ownerId },
    { $set: req.validated },
    { new: true },
  );

  return res.json({ message: "Sale updated.", sale: updated });
};