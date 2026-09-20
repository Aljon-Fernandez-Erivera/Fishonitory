const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const noteController = require("../controllers/noteController");
const {
  validateNoteCreate,
  validateNoteUpdate,
  validateObjectIdParam,
} = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);

router.get("/", noteController.listNotes);
router.post("/", validateNoteCreate, noteController.createNote);
router.patch("/:id", validateObjectIdParam("id"), validateNoteUpdate, noteController.updateNote);
router.delete("/:id", validateObjectIdParam("id"), noteController.deleteNote);

module.exports = router;