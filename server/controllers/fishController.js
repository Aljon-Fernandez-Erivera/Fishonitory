const Fish = require('../models/Fish');

exports.listFish = async (req, res) => {
  const fish = await Fish.find({ ownerId: req.user.userId }).sort({ createdAt: -1 });
  return res.json({ fish });
};

exports.createFish = async (req, res) => {
  const { name, species, quantity, description, photoUrl } = req.body;
  if (!name || !species || quantity === undefined) {
    return res.status(400).json({ message: 'Fish name, species, and quantity are required.' });
  }
  const fish = await Fish.create({ ownerId: req.user.userId, name, species, quantity, description, photoUrl });
  return res.status(201).json({ message: 'Fish item added successfully.', fish });
};

exports.updateFish = async (req, res) => {
  const fish = await Fish.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!fish) return res.status(404).json({ message: 'Fish item not found.' });
  return res.json({ message: 'Fish item updated successfully.', fish });
};

exports.deleteFish = async (req, res) => {
  const fish = await Fish.findOneAndDelete({ _id: req.params.id, ownerId: req.user.userId });
  if (!fish) return res.status(404).json({ message: 'Fish item not found.' });
  return res.json({ message: 'Fish item deleted successfully.' });
};
