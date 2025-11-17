const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// Guest/User Cart
router.get('/', protect, cartController.getCart);
router.post('/add', cartController.addItemToCart);
router.post('/remove', protect, cartController.removeItemFromCart);
router.patch('/update-quantity', protect, cartController.updateCartItemQuantity);
router.delete('/', protect, cartController.clearCart);

module.exports = router;
