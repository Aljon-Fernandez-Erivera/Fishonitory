const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const fishController = require('../controllers/fishController');

const router = express.Router();
router.use(authMiddleware);
router.get('/', fishController.listFish);
router.post('/', fishController.createFish);
router.patch('/:id', fishController.updateFish);
router.delete('/:id', fishController.deleteFish);

module.exports = router;
