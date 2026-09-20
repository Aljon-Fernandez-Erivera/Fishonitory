const Tank = require("../models/Tank");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");

const CLEANED_STATUSES = ["Clean", "Available"];

const addDays = (days) => new Date(Date.now() + days * 86400000);

exports.listTanks = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role)) {
    return res.status(403).json({ message: 'This account cannot view tanks.' });
  }
  const ownerId = await getOwnerId(req);

  // Auto-flip anything overdue before returning, so status/notifications stay accurate
  // without requiring the owner to manually update it.
  await Tank.updateMany(
    { ownerId, nextMaintenance: { $lte: new Date() }, status: { $ne: "Needs Cleaning" } },
    { $set: { status: "Needs Cleaning" } },
  );

  const tanks = await Tank.find({ ownerId })
    .populate('updatedBy', 'ownerName staffName staffPosition role')
    .sort({ createdAt: -1 });
  return res.json({ tanks });
};

exports.createTank = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can add tanks." });
  const { name, status, nextMaintenance, notes, cleaningFrequencyDays } = req.body;
  if (!name) return res.status(400).json({ message: "Tank name is required." });

  const frequency = cleaningFrequencyDays ? Number(cleaningFrequencyDays) : null;
  const tank = await Tank.create({
    ownerId: req.user.userId,
    name,
    status,
    nextMaintenance: nextMaintenance || (frequency ? addDays(frequency) : null),
    cleaningFrequencyDays: frequency,
    notes,
    updatedBy: req.user.userId,
  });
  return res.status(201).json({ message: "Tank added successfully.", tank });
};

exports.updateTank = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role))
    return res
      .status(403)
      .json({ message: "This account cannot update tanks." });
  const ownerId = await getOwnerId(req);
  const updates =
    req.user.role === "Owner"
      ? Object.fromEntries(
          ["name", "status", "nextMaintenance", "notes", "cleaningFrequencyDays"]
            .filter((field) =>
              Object.prototype.hasOwnProperty.call(req.body, field),
            )
            .map((field) => [field, req.body[field]]),
        )
      : { status: req.body.status, updatedBy: req.user.userId };
  if (req.user.role === 'Owner') updates.updatedBy = req.user.userId;

  // Pull the current record first so we know its saved frequency when recalculating.
  const existing = await Tank.findOne({ _id: req.params.id, ownerId });
  if (!existing) return res.status(404).json({ message: "Tank not found." });

  if (CLEANED_STATUSES.includes(updates.status) && existing.cleaningFrequencyDays) {
    updates.nextMaintenance = addDays(existing.cleaningFrequencyDays);
  }

  const tank = await Tank.findOneAndUpdate(
    { _id: req.params.id, ownerId },
    updates,
    { new: true, runValidators: true },
  );
  if (!tank) return res.status(404).json({ message: "Tank not found." });
  await writeAudit(req, "UPDATE", "Tank", tank._id, `Status: ${tank.status}`);
  await tank.populate('updatedBy', 'ownerName staffName staffPosition role');
  return res.json({ message: 'Tank updated successfully.', tank });
};

exports.deleteTank = async (req, res) => {
  if (req.user.role !== "Owner")
    return res.status(403).json({ message: "Only owners can delete tanks." });
  const Fish = require("../models/Fish");
  const tank = await Tank.findOne({
    _id: req.params.id,
    ownerId: req.user.userId,
  });
  if (!tank) return res.status(404).json({ message: "Tank not found." });
  const assignedFish = await Fish.exists({ tankId: tank._id, ownerId: req.user.userId });
  if (assignedFish) {
    return res.status(409).json({ message: "Reassign or remove all fish from this tank before deleting it." });
  }
  await tank.deleteOne();
  return res.json({ message: "Tank deleted successfully." });
};