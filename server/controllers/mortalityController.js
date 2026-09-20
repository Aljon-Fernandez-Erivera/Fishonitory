const Fish = require("../models/Fish");
const Mortality = require("../models/Mortality");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");
const mongoose = require("mongoose");

exports.listMortality = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role))
    return res.status(403).json({ message: "This account cannot view mortality records." });
  const ownerId = await getOwnerId(req);
  const records = await Mortality.find({ ownerId })
    .populate("recordedBy", "ownerName staffName")
    .sort({ recordedAt: -1 });
  return res.json({ records });
};

exports.createMortality = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can record mortality." });
  const ownerId = req.user.userId;
  const session = await mongoose.startSession();
  let record;
  try {
    await session.withTransaction(async () => {
      const fish = await Fish.findOneAndUpdate(
        { _id: req.body.fishId, ownerId, quantity: { $gte: req.body.quantity } },
        { $inc: { quantity: -req.body.quantity } }, { new: true, session },
      );
      if (!fish) throw new Error("Insufficient stock or fish item not found.");
      [record] = await Mortality.create([{ ownerId, fishId: fish._id, fishName: fish.name, quantity: req.body.quantity, reason: req.body.reason.trim(), recordedAt: req.body.recordedAt || new Date(), recordedBy: req.user.userId }], { session });
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Mortality could not be recorded." });
  } finally {
    await session.endSession();
  }
  await writeAudit(req, "CREATE", "Mortality", record._id, `${record.quantity} ${record.fishName}: ${record.reason}`);
  return res.status(201).json({ message: "Mortality recorded and stock updated.", record });
};
