const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const storeController = require('../controllers/storeController');

const router = express.Router();
router.use(authMiddleware);
router.get('/tanks', storeController.listTanks);
router.post('/tanks', storeController.createTank);
router.patch('/tanks/:id', storeController.updateTank);
router.delete('/tanks/:id', storeController.deleteTank);

module.exports = router;
