const express = require('express');
const router = express.Router();
const foodController = require('../controllers/foodController');
const { protect, restaurant } = require('../middleware/authMiddleware');

router.post('/', protect, restaurant, foodController.createFood);
router.get('/', foodController.getFoods);
router.get('/:id', foodController.getFoodById);
router.put('/:id', protect, restaurant, foodController.updateFood);
router.delete('/:id', protect, restaurant, foodController.deleteFood);

module.exports = router;
