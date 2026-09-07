const Note = require("../models/Note");
const getOwnerId = require("../utils/ownerScope");

exports.listNotes = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role)) {
    return res.status(403).json({ message: 'This account cannot view notes.' });
  }
  const ownerId = await getOwnerId(req);
  if (!ownerId)
    return res.status(404).json({ message: "Owner account not found." });
  const notes = await Note.find({ ownerId })
    .populate("authorId", "ownerName staffName staffPosition role")
    .sort({ createdAt: -1 });
  return res.json({ notes });
};

exports.createNote = async (req, res) => {
  if (!['Owner', 'masterStaff'].includes(req.user.role)) {
    return res.status(403).json({ message: 'This account cannot create notes.' });
  }
  const ownerId = await getOwnerId(req);
  const text = req.body.text?.trim();
  if (!ownerId)
    return res.status(404).json({ message: "Owner account not found." });
  if (!text) return res.status(400).json({ message: "Note text is required." });
  const note = await Note.create({ ownerId, authorId: req.user.userId, text });
  return res.status(201).json({ message: "Note added successfully.", note });
};
