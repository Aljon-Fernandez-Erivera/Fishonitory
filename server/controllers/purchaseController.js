const mongoose = require("mongoose");
const Fish = require("../models/Fish");
const Purchase = require("../models/Purchase");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");
const { cleanText } = require("../utils/validators");

function ownerOnly(req, res) {
  if (req.user.role !== "Owner") {
    res.status(403).json({ message: "Only owners can manage purchases." });
    return false;
  }
  return true;
}

// Clean text and reject characters that matter for injection / markup.
function checkText(raw, label, { min = 1, max = 120, optional = false } = {}) {
  if (raw === undefined || raw === null || raw === "") {
    return optional ? { value: "" } : { error: `${label} is required.` };
  }
  const value = cleanText(raw);
  if (value === null) return { error: `${label} must be text.` };
  if (value.length < min || value.length > max)
    return { error: `${label} must be ${min}-${max} characters.` };
  if (/[<>{}`$\\]/.test(value))
    return { error: `${label} contains characters that are not allowed.` };
  return { value };
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
  const body = req.body && typeof req.body === "object" ? req.body : {};

  // ---- validate everything before touching stock ----
  const supplierName = checkText(body.supplierName, "Supplier name", { min: 2, max: 120 });
  if (supplierName.error) return res.status(400).json({ message: supplierName.error });

  const supplierContact = checkText(body.supplierContact, "Supplier contact", { max: 120, optional: true });
  if (supplierContact.error) return res.status(400).json({ message: supplierContact.error });

  const invoiceNumber = checkText(body.invoiceNumber, "Invoice number", { max: 80, optional: true });
  if (invoiceNumber.error) return res.status(400).json({ message: invoiceNumber.error });

  const notes = checkText(body.notes, "Notes", { max: 1000, optional: true });
  if (notes.error) return res.status(400).json({ message: notes.error });

  let purchasedAt = new Date();
  if (body.purchasedAt !== undefined && body.purchasedAt !== "") {
    purchasedAt = new Date(body.purchasedAt);
    if (Number.isNaN(purchasedAt.getTime()) || purchasedAt.getTime() > Date.now() + 86400000) {
      return res.status(400).json({ message: "Purchase date is invalid." });
    }
  }

  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    return res.status(400).json({ message: "Add 1 to 50 items to the purchase." });
  }

  const entries = [];
  for (const entry of body.items) {
    const fishId = entry?.fishId;
    const quantity = Number(entry?.quantity);
    const unitCost = Number(entry?.unitCost);

    if (typeof fishId !== "string" || !mongoose.isValidObjectId(fishId)) {
      return res.status(400).json({ message: "One selected inventory item is invalid." });
    }
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000000) {
      return res.status(400).json({ message: "Quantity must be between 1 and 1,000,000." });
    }
    if (!Number.isFinite(unitCost) || unitCost < 0.01 || unitCost > 10000000) {
      return res.status(400).json({ message: "Unit cost must be between 0.01 and 10,000,000." });
    }
    entries.push({ fishId, quantity, unitCost: Math.round(unitCost * 100) / 100 });
  }

  const changed = [];

  try {
    const purchaseItems = [];
    for (const entry of entries) {
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
      supplierName: supplierName.value,
      supplierContact: supplierContact.value,
      invoiceNumber: invoiceNumber.value,
      purchasedAt,
      items: purchaseItems,
      totalCost,
      notes: notes.value,
      recordedBy: req.user.userId,
    });
    await writeAudit(req, "CREATE", "Purchase", purchase._id, `Purchase from ${supplierName.value}`);
    return res.status(201).json({ message: "Purchase recorded and inventory updated.", purchase });
  } catch (error) {
    // Undo any stock that was already increased.
    await Promise.all(
      changed.map((item) =>
        Fish.findByIdAndUpdate(item.id, { $inc: { quantity: -item.quantity } }),
      ),
    );
    return res.status(400).json({ message: error.message || "Purchase could not be recorded." });
  }
};