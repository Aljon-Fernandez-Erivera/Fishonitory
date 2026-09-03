const Tank = require('../models/Tank');

exports.listTanks = async (req, res) => {
  const tanks = await Tank.find({ ownerId: req.user.userId }).sort({ createdAt: -1 });
  return res.json({ tanks });
};

exports.createTank = async (req, res) => {
  const { name, status, nextMaintenance, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'Tank name is required.' });
  const tank = await Tank.create({ ownerId: req.user.userId, name, status, nextMaintenance, notes });
  return res.status(201).json({ message: 'Tank added successfully.', tank });
};

exports.updateTank = async (req, res) => {
  const tank = await Tank.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!tank) return res.status(404).json({ message: 'Tank not found.' });
  return res.json({ message: 'Tank updated successfully.', tank });
};

exports.deleteTank = async (req, res) => {
  const tank = await Tank.findOneAndDelete({ _id: req.params.id, ownerId: req.user.userId });
  if (!tank) return res.status(404).json({ message: 'Tank not found.' });
  return res.json({ message: 'Tank deleted successfully.' });
};
