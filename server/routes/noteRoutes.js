const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const noteController = require("../controllers/noteController");
const { validateNote } = require("../middleware/requestValidators");

const router = express.Router();
router.use(authMiddleware);
router.get("/", noteController.listNotes);
router.post("/", validateNote, noteController.createNote);

module.exports = router;
