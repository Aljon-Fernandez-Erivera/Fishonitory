const Fish = require("../models/Fish");
const Purchase = require("../models/Purchase");
const { cleanText } = require("../utils/validators");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");
const cloudinary = require("cloudinary").v2;
const config = require("../config/config");

const jpegSignature = Buffer.from([0xff, 0xd8, 0xff]);
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const hasValidImageSignature = (file) => {
  const expected = file.mimetype === "image/jpeg" ? jpegSignature : pngSignature;
  return file.buffer?.subarray(0, expected.length).equals(expected);
};

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
  secure: true,
});


exports.uploadPhoto = async (req, res) => {
  if (req.user.role !== "Owner") return res.status(403).json({ message: "Only owners can upload inventory photos." });
  if (!req.file || !hasValidImageSignature(req.file)) return res.status(400).json({ message: "Upload a valid JPEG or PNG image." });
  if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) return res.status(503).json({ message: "Image uploads are not configured." });
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: "fishonitory/inventory", resource_type: "image", allowed_formats: ["jpg", "png"], format: "webp", transformation: [{ width: 1200, height: 1200, crop: "limit" }] }, (error, uploadResult) => error ? reject(error) : resolve(uploadResult));
      stream.end(req.file.buffer);
    });
    return res.status(201).json({ photoUrl: result.secure_url });
  } catch {
    return res.status(502).json({ message: "Image upload failed. Please try again." });
  }
};

exports.listFish = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role)) {
    return res.status(403).json({ message: 'This account cannot view inventory.' });
  }
  const ownerId = await getOwnerId(req);
  const fish = await Fish.find({ ownerId })
    .populate("tankId", "name status")
    .sort({ createdAt: -1 });
  return res.json({ fish });
};

// ---------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------
const CATEGORIES = ["Fish", "Fish Food"];
const SOURCES = ["Purchased", "Bred in-house", "Opening stock"];

// Clean text and reject characters that matter for injection / markup.
function checkText(raw, label, { min = 1, max = 100, optional = false } = {}) {
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

function checkMoney(raw, label) {
  if (typeof raw !== "number" && typeof raw !== "string")
    return { error: `${label} is invalid.` };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1 || value > 10000000)
    return { error: `${label} must be between 1 and 10,000,000.` };
  return { value: Math.round(value * 100) / 100 };
}

function checkQuantity(raw, category, label = "Quantity") {
  if (typeof raw !== "number" && typeof raw !== "string")
    return { error: `${label} is invalid.` };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1 || value > 1000000)
    return { error: `${label} must be between 1 and 1,000,000.` };
  if (category !== "Fish Food" && !Number.isInteger(value))
    return { error: `${label} must be a whole number for fish.` };
  return { value };
}

// Photos come from our own upload endpoint (Cloudinary), so only accept https.
function checkPhotoUrl(raw) {
  if (raw === undefined || raw === null || raw === "") return { value: "" };
  if (typeof raw !== "string" || raw.length > 500)
    return { error: "Photo link is invalid." };
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") throw new Error("not https");
  } catch {
    return { error: "Photo link is invalid." };
  }
  return { value: raw };
}

async function checkTank(tankId, ownerId) {
  if (typeof tankId !== "string" || !/^[a-f\d]{24}$/i.test(tankId))
    return "Choose a valid tank.";
  const Tank = require("../models/Tank");
  const tank = await Tank.findOne({ _id: tankId, ownerId });
  return tank ? "" : "Selected tank does not belong to this store.";
}

// ---------------------------------------------------------------------
// Create. When the stock was bought ("Purchased") the purchase history entry
// is created in the same action, so the owner never types it twice.
// ---------------------------------------------------------------------
exports.createFish = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can add inventory." });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const ownerId = req.user.userId;

  const category = body.category === undefined ? "Fish" : body.category;
  if (!CATEGORIES.includes(category))
    return res.status(400).json({ message: "Category must be Fish or Fish Food." });

  const source = body.source === undefined ? "Opening stock" : body.source;
  if (!SOURCES.includes(source))
    return res.status(400).json({ message: "Choose where this stock came from." });

  const name = checkText(body.name, "Name", { min: 2, max: 100 });
  if (name.error) return res.status(400).json({ message: name.error });

  const species = checkText(body.species, "Species", { min: 2, max: 100 });
  if (species.error) return res.status(400).json({ message: species.error });

  const description = checkText(body.description, "Description", { max: 1000, optional: true });
  if (description.error) return res.status(400).json({ message: description.error });

  const price = checkMoney(body.price, "Selling price");
  if (price.error) return res.status(400).json({ message: price.error });

  const costPrice = checkMoney(body.costPrice, "Cost price");
  if (costPrice.error) return res.status(400).json({ message: costPrice.error });

  const quantity = checkQuantity(body.quantity, category);
  if (quantity.error) return res.status(400).json({ message: quantity.error });

  const photo = checkPhotoUrl(body.photoUrl);
  if (photo.error) return res.status(400).json({ message: photo.error });

  let supplier = { value: "" };
  if (source === "Purchased") {
    supplier = checkText(body.supplierName, "Supplier name", { min: 2, max: 120 });
    if (supplier.error) return res.status(400).json({ message: supplier.error });
  }

  let tankId = null;
  if (category !== "Fish Food") {
    if (!body.tankId)
      return res.status(400).json({ message: "Choose a tank before adding fish." });
    const tankProblem = await checkTank(body.tankId, ownerId);
    if (tankProblem) return res.status(400).json({ message: tankProblem });
    tankId = body.tankId;
  }

  const fish = await Fish.create({
    ownerId,
    name: name.value,
    species: species.value,
    category,
    tankId,
    price: price.value,
    costPrice: costPrice.value,
    quantity: quantity.value,
    description: description.value,
    photoUrl: photo.value,
  });

  let purchase = null;
  if (source === "Purchased") {
    try {
      purchase = await Purchase.create({
        ownerId,
        supplierName: supplier.value,
        purchasedAt: new Date(),
        items: [
          {
            fishId: fish._id,
            name: fish.name,
            quantity: quantity.value,
            unitCost: costPrice.value,
            total: quantity.value * costPrice.value,
          },
        ],
        totalCost: quantity.value * costPrice.value,
        notes: "Recorded automatically when the item was added to inventory.",
        recordedBy: req.user.userId,
      });
    } catch (error) {
      // Never keep stock that has no purchase behind it.
      await Fish.findByIdAndDelete(fish._id);
      console.error("Auto purchase failed:", error.message);
      return res
        .status(500)
        .json({ message: "Could not record the purchase, so the item was not added." });
    }
  }

  await writeAudit(
    req,
    "CREATE",
    "Fish",
    fish._id,
    `Inventory item ${fish.name} added (${quantity.value} pcs, source: ${source})`,
  );
  if (purchase) {
    await writeAudit(
      req,
      "CREATE",
      "Purchase",
      purchase._id,
      `Purchase from ${supplier.value} (auto, from inventory)`,
    );
  }

  return res.status(201).json({
    message: purchase
      ? "Item added and purchase recorded."
      : "Fish item added successfully.",
    fish,
    purchase,
  });
};

// ---------------------------------------------------------------------
// Update details. Quantity is NOT editable here any more: stock changes only
// through a purchase (restock), a sale, a mortality report, or "Adjust stock"
// with a reason, so the numbers can always be explained.
// ---------------------------------------------------------------------
exports.updateFish = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can update inventory." });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const ownerId = req.user.userId;

  const existing = await Fish.findOne({ _id: req.params.id, ownerId });
  if (!existing) return res.status(404).json({ message: "Fish item not found." });

  const updates = {};
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);

  if (has("category")) {
    if (!CATEGORIES.includes(body.category))
      return res.status(400).json({ message: "Category must be Fish or Fish Food." });
    updates.category = body.category;
  }
  const category = updates.category || existing.category || "Fish";

  if (has("name")) {
    const r = checkText(body.name, "Name", { min: 2, max: 100 });
    if (r.error) return res.status(400).json({ message: r.error });
    updates.name = r.value;
  }
  if (has("species")) {
    const r = checkText(body.species, "Species", { min: 2, max: 100 });
    if (r.error) return res.status(400).json({ message: r.error });
    updates.species = r.value;
  }
  if (has("description")) {
    const r = checkText(body.description, "Description", { max: 1000, optional: true });
    if (r.error) return res.status(400).json({ message: r.error });
    updates.description = r.value;
  }
  if (has("price")) {
    const r = checkMoney(body.price, "Selling price");
    if (r.error) return res.status(400).json({ message: r.error });
    updates.price = r.value;
  }
  if (has("costPrice")) {
    const r = checkMoney(body.costPrice, "Cost price");
    if (r.error) return res.status(400).json({ message: r.error });
    updates.costPrice = r.value;
  }
  if (has("photoUrl")) {
    const r = checkPhotoUrl(body.photoUrl);
    if (r.error) return res.status(400).json({ message: r.error });
    updates.photoUrl = r.value;
  }

  // Old clients send the whole form back, quantity included. Unchanged is fine;
  // a different number is refused.
  if (has("quantity") && Number(body.quantity) !== existing.quantity) {
    return res.status(400).json({
      message: "Quantity cannot be edited here. Use Adjust stock or record a purchase.",
    });
  }

  if (category === "Fish Food") {
    updates.tankId = null;
  } else {
    const tankId = has("tankId") ? body.tankId : existing.tankId?.toString();
    if (!tankId)
      return res.status(400).json({ message: "Choose a tank before saving fish." });
    if (has("tankId")) {
      const tankProblem = await checkTank(String(tankId), ownerId);
      if (tankProblem) return res.status(400).json({ message: tankProblem });
      updates.tankId = tankId;
    }
  }

  const fish = await Fish.findOneAndUpdate(
    { _id: req.params.id, ownerId },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!fish) return res.status(404).json({ message: "Fish item not found." });

  await writeAudit(req, "UPDATE", "Fish", fish._id, `Inventory item ${fish.name} updated`);
  return res.json({ message: "Fish item updated successfully.", fish });
};

// ---------------------------------------------------------------------
// Adjust stock (count correction): +/- whole amount with a required reason.
// ---------------------------------------------------------------------
exports.adjustStock = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can adjust stock." });

  const body = req.body && typeof req.body === "object" ? req.body : {};

  const change = Number(body.change);
  if (
    (typeof body.change !== "number" && typeof body.change !== "string") ||
    !Number.isInteger(change) ||
    change === 0 ||
    Math.abs(change) > 100000
  ) {
    return res
      .status(400)
      .json({ message: "Enter a whole number to add or remove (not 0)." });
  }

  const reason = checkText(body.reason, "Reason", { min: 3, max: 200 });
  if (reason.error) return res.status(400).json({ message: reason.error });

  const fish = await Fish.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.userId, quantity: { $gte: -change } },
    { $inc: { quantity: change } },
    { new: true },
  );

  if (!fish) {
    const exists = await Fish.exists({ _id: req.params.id, ownerId: req.user.userId });
    return exists
      ? res.status(400).json({ message: "You cannot remove more than the current stock." })
      : res.status(404).json({ message: "Fish item not found." });
  }

  await writeAudit(
    req,
    "UPDATE",
    "Fish",
    fish._id,
    `Stock adjusted ${change > 0 ? "+" : ""}${change} for ${fish.name} (${reason.value}). New quantity: ${fish.quantity}`,
  );
  return res.json({ message: "Stock adjusted.", fish });
};

exports.deleteFish = async (req, res) => {
  if (req.user.role !== "Owner") {
    return res.status(403).json({ message: "Only owners can delete inventory." });
  }
  const fish = await Fish.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.userId,
  });
  if (!fish) return res.status(404).json({ message: "Fish item not found." });
  try {
    await writeAudit(
      req,
      "DELETE",
      "Fish",
      fish._id,
      `Inventory item ${fish.name} deleted (had ${fish.quantity} in stock)`,
    );
  } catch (auditError) {
    // The audit log may not accept DELETE; the item is already deleted.
    console.error("Delete audit failed:", auditError.message);
  }
  return res.json({ message: "Fish item deleted successfully." });
};