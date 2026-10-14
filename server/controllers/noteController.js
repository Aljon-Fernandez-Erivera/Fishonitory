const Note = require("../models/Note");
const User = require("../models/User");
const getOwnerId = require("../utils/ownerScope");
const { writeAudit } = require("../utils/audit");

const NOTE_ROLES = ["Owner", "masterStaff", "Staff"];
const AUTHOR_FIELDS = "ownerName staffName staffPosition role";
const ASSIGNEE_FIELDS = "staffName staffPosition role";

const canModerate = (role) => role === "Owner" || role === "masterStaff";

/** authorId may be populated (object) or a raw ObjectId. */
const idOf = (value) =>
  value && value._id ? String(value._id) : String(value ?? "");

const resolveScope = async (req, res) => {
  if (!NOTE_ROLES.includes(req.user.role)) {
    res.status(403).json({ message: "This account cannot access notes." });
    return null;
  }
  const ownerId = await getOwnerId(req);
  if (!ownerId) {
    res.status(404).json({ message: "Owner account not found." });
    return null;
  }
  return ownerId;
};

exports.listNotes = async (req, res) => {
  const ownerId = await resolveScope(req, res);
  if (!ownerId) return undefined;

  const matcher = { ownerId };
  if (req.user.role !== "Owner") {
    matcher.visibility = "public";
  }

  const notes = await Note.find(matcher)
    .populate("authorId", AUTHOR_FIELDS)
    .populate("assignedTo", ASSIGNEE_FIELDS)
    .sort({ pinned: -1, createdAt: -1 })
    .lean();

  return res.json({
    notes,
    permissions: {
      canModerate: canModerate(req.user.role),
      userId: String(req.user.userId),
    },
  });
};

exports.createNote = async (req, res) => {
  const ownerId = await resolveScope(req, res);
  if (!ownerId) return undefined;
  if (req.validated.isTask && !canModerate(req.user.role))
    return res.status(403).json({ message: "Only the owner or a master staff can create tasks." });

  const { assignedTo, ...validated } = req.validated;
  if (assignedTo) {
    const assignee = await User.findOne({
      _id: assignedTo,
      ownerId,
      role: { $in: ["Staff", "masterStaff"] },
      accountStatus: "Active",
    }).select("_id").lean();
    if (!assignee) return res.status(400).json({ message: "Choose a staff member from this business." });
  }

  const created = await Note.create({
    ownerId,
    authorId: req.user.userId,
    ...validated,
    text: req.validated.text,
    visibility: req.validated.visibility || "public",
    isTask: Boolean(req.validated.isTask),
    taskStatus: req.validated.isTask ? (req.validated.taskStatus || "pending") : "pending",
    assignedTo: req.validated.isTask ? assignedTo : null,
  });

  const note = await Note.findById(created._id)
    .populate("authorId", AUTHOR_FIELDS)
    .populate("assignedTo", ASSIGNEE_FIELDS)
    .lean();

  await writeAudit(req, "CREATE", "Announcement", created._id, "Announcement board post created.");
  return res.status(201).json({ message: "Announcement posted successfully.", note });
};

exports.updateNote = async (req, res) => {
  const ownerId = await resolveScope(req, res);
  if (!ownerId) return undefined;

  const existing = await Note.findOne({ _id: req.params.id, ownerId });
  if (!existing) return res.status(404).json({ message: "Note not found." });

  const moderator = canModerate(req.user.role);
  const isAuthor = idOf(existing.authorId) === String(req.user.userId);
  const changes = { ...req.validated };

  if (changes.assignedTo) {
    const assignee = await User.findOne({
      _id: changes.assignedTo,
      ownerId,
      role: { $in: ["Staff", "masterStaff"] },
      accountStatus: "Active",
    }).select("_id").lean();
    if (!assignee) return res.status(400).json({ message: "Choose a staff member from this business." });
  }

  if (changes.text !== undefined && !isAuthor && !moderator)
    return res
      .status(403)
      .json({ message: "You can only edit notes you wrote." });

  if (changes.pinned !== undefined && !moderator)
    return res
      .status(403)
      .json({ message: "Only the owner or a master staff can pin notes." });

  // Whether an announcement counts as a task is the owner's call, not
  // something any note viewer should be able to flip on their own.
  if (changes.isTask !== undefined && !moderator)
    return res
      .status(403)
      .json({ message: "Only the owner or a master staff can turn a note into a task." });

  if ((changes.dueDate !== undefined || changes.assignedTo !== undefined) && !moderator)
    return res.status(403).json({ message: "Only the owner or a master staff can update task details." });

  if (changes.isTask === false) {
    changes.dueDate = null;
    changes.assignedTo = null;
  }
  if (
    (changes.dueDate !== undefined || changes.assignedTo !== undefined) &&
    existing.isTask !== true &&
    changes.isTask !== true &&
    changes.isTask !== false
  ) {
    return res.status(400).json({ message: "Task details can only be added to a task." });
  }

  // Marking a task done needs a name attached so the owner can see who
  // finished it — mirrors the "shared task, name required" flow requested.
  if (changes.taskStatus === "done") {
    const completedBy = String(changes.completedBy || "").trim();
    if (!completedBy) {
      return res
        .status(400)
        .json({ message: "Enter your name to mark this task done." });
    }
    changes.completedBy = completedBy;
  }

  if (changes.taskStatus === "pending") {
    changes.completedBy = "";
  }

  const note = await Note.findOneAndUpdate(
    { _id: existing._id, ownerId },
    { $set: changes },   // explicit whitelisted fields only, never req.body
    { new: true, runValidators: true },
  )
    .populate("authorId", AUTHOR_FIELDS)
    .populate("assignedTo", ASSIGNEE_FIELDS)
    .lean();

  await writeAudit(req, "UPDATE", "Announcement", note._id, "Announcement board post updated.");
  return res.json({ message: "Announcement updated.", note });
};

exports.deleteNote = async (req, res) => {
  const ownerId = await resolveScope(req, res);
  if (!ownerId) return undefined;

  const existing = await Note.findOne({ _id: req.params.id, ownerId }).lean();
  if (!existing) return res.status(404).json({ message: "Note not found." });

  if (idOf(existing.authorId) !== String(req.user.userId) && !canModerate(req.user.role))
    return res
      .status(403)
      .json({ message: "You can only delete notes you wrote." });

  await Note.deleteOne({ _id: existing._id, ownerId });
  await writeAudit(req, "DELETE", "Announcement", existing._id, "Announcement board post deleted.");
  return res.json({ message: "Note deleted." });
};
