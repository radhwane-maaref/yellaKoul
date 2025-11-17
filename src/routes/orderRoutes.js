const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/checkout', protect, orderController.checkoutOrder);
router.get('/history', protect, orderController.getOrderHistory);
router.post('/:id/reorder', protect, orderController.reorderPastOrder);
router.post('/', protect, orderController.createOrder);
router.get('/', protect, orderController.getOrders);
router.get('/:id', protect, orderController.getOrderById);
router.put('/:id', protect, orderController.updateOrder);
router.delete('/:id', protect, admin, orderController.deleteOrder);

module.exports = router;
