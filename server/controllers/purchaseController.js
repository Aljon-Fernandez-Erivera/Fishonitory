const Fish = require("../models/Fish");
const Purchase = require("../models/Purchase");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");

function ownerOnly(req, res) {
  if (req.user.role !== "Owner") {
    res.status(403).json({ message: "Only owners can manage purchases." });
    return false;
  }
  return true;
}

exports.listPurchases = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  const ownerId = await getOwnerId(req);
  const purchases = await Purchase.find({ ownerId })
    .populate("recordedBy", "ownerName staffName")
    .sort({ purchasedAt: -1 });
  return res.json({ purchases });
};

exports.createPurchase = async (req, res) => {
  if (!ownerOnly(req, res)) return;
  const ownerId = req.user.userId;
  const { supplierName, supplierContact, invoiceNumber, purchasedAt, notes, items } = req.body;
  const changed = [];

  try {
    const purchaseItems = [];
    for (const entry of items) {
      const fish = await Fish.findOneAndUpdate(
        { _id: entry.fishId, ownerId },
        {
          $inc: { quantity: entry.quantity },
          $set: { costPrice: entry.unitCost },
        },
        { new: true },
      );
      if (!fish) throw new Error("One selected inventory item was not found.");
      changed.push({ id: fish._id, quantity: entry.quantity });
      purchaseItems.push({
        fishId: fish._id,
        name: fish.name,
        quantity: entry.quantity,
        unitCost: entry.unitCost,
        total: entry.quantity * entry.unitCost,
      });
    }
    const totalCost = purchaseItems.reduce((sum, item) => sum + item.total, 0);
    const purchase = await Purchase.create({
      ownerId,
      supplierName: supplierName.trim(),
      supplierContact: supplierContact?.trim() || "",
      invoiceNumber: invoiceNumber?.trim() || "",
      purchasedAt: purchasedAt || new Date(),
      items: purchaseItems,
      totalCost,
      notes: notes?.trim() || "",
      recordedBy: req.user.userId,
    });
    await writeAudit(req, "CREATE", "Purchase", purchase._id, `Purchase from ${supplierName.trim()}`);
    return res.status(201).json({ message: "Purchase recorded and inventory updated.", purchase });
  } catch (error) {
    await Promise.all(changed.map((item) => Fish.findByIdAndUpdate(item.id, { $inc: { quantity: -item.quantity } })));
    return res.status(400).json({ message: error.message || "Purchase could not be recorded." });
  }
};
