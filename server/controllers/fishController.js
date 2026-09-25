const Fish = require("../models/Fish");
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

exports.createFish = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can add inventory." });
  const {
    name,
    species,
    category,
    tankId,
    price,
    costPrice,
    quantity,
    description,
    photoUrl,
  } = req.body;
  if (!name || !species || quantity === undefined) {
    return res
      .status(400)
      .json({ message: "Fish name, species, and quantity are required." });
  }
  if (
    !Number.isFinite(Number(price)) ||
    Number(price) < 1 ||
    !Number.isFinite(Number(costPrice)) ||
    Number(costPrice) < 1 ||
    !Number.isFinite(Number(quantity)) ||
    Number(quantity) < 1
  ) {
    return res
      .status(400)
      .json({ message: "Price, cost price, and quantity must be at least 1." });
  }
  if (category !== "Fish Food" && !tankId)
    return res
      .status(400)
      .json({ message: "Choose a tank before adding fish." });
  if (tankId) {
    const Tank = require("../models/Tank");
    const tank = await Tank.findOne({ _id: tankId, ownerId: req.user.userId });
    if (!tank)
      return res
        .status(400)
        .json({ message: "Selected tank does not belong to this store." });
  }
  const fish = await Fish.create({
    ownerId: req.user.userId,
    name,
    species,
    category,
    tankId: category === "Fish Food" ? null : tankId,
    price,
    costPrice,
    quantity,
    description,
    photoUrl,
  });
  await writeAudit(req, "CREATE", "Fish", fish._id, `Inventory item ${fish.name}`);
  return res
    .status(201)
    .json({ message: "Fish item added successfully.", fish });
};

exports.updateFish = async (req, res) => {
  if (req.user.role !== "Owner")
    return res
      .status(403)
      .json({ message: "Only owners can update inventory." });
  const normalizedPrice = req.body.price !== undefined ? Number(req.body.price) : undefined;
  const normalizedCostPrice = req.body.costPrice !== undefined ? Number(req.body.costPrice) : undefined;
  const normalizedQuantity = req.body.quantity !== undefined ? Number(req.body.quantity) : undefined;

  if (
    (req.body.price !== undefined && (!Number.isFinite(normalizedPrice) || normalizedPrice < 1)) ||
    (req.body.costPrice !== undefined && (!Number.isFinite(normalizedCostPrice) || normalizedCostPrice < 1)) ||
    (req.body.quantity !== undefined && (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 1))
  ) {
    return res
      .status(400)
      .json({ message: "Price, cost price, and quantity must be at least 1." });
  }

  if (req.body.category !== "Fish Food" && !req.body.tankId)
    return res
      .status(400)
      .json({ message: "Choose a tank before saving fish." });
  if (req.body.tankId) {
    const Tank = require("../models/Tank");
    const tank = await Tank.findOne({
      _id: req.body.tankId,
      ownerId: req.user.userId,
    });
    if (!tank)
      return res
        .status(400)
        .json({ message: "Selected tank does not belong to this store." });
  }
  const allowedFields = [
    "name",
    "species",
    "category",
    "tankId",
    "price",
    "costPrice",
    "quantity",
    "description",
    "photoUrl",
  ];
  const updates = Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
      .map((field) => [field, req.body[field]]),
  );
  if (updates.category === "Fish Food") updates.tankId = null;
  const fish = await Fish.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.userId },
    updates,
    { new: true, runValidators: true },
  );
  if (!fish) return res.status(404).json({ message: "Fish item not found." });
  await writeAudit(req, "UPDATE", "Fish", fish._id, `Inventory item ${fish.name}`);
  return res.json({ message: "Fish item updated successfully.", fish });
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
  return res.json({ message: "Fish item deleted successfully." });
};
