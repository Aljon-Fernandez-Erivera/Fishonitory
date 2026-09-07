const Fish = require("../models/Fish");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");

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
  const fish = await Fish.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.userId,
  });
  if (!fish) return res.status(404).json({ message: "Fish item not found." });
  return res.json({ message: "Fish item deleted successfully." });
};
