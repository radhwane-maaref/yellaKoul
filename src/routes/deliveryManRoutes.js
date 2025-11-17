const express = require('express');
const router = express.Router();
const deliveryManController = require('../controllers/deliveryManController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Delivery Man Order Management
router.get('/orders/assigned', protect, authorizeRoles('deliveryMan'), deliveryManController.getAssignedOrders);
router.patch('/orders/:orderId/accept', protect, authorizeRoles('deliveryMan'), deliveryManController.acceptOrder);
router.patch('/orders/:orderId/decline', protect, authorizeRoles('deliveryMan'), deliveryManController.declineOrder);
router.patch('/orders/:orderId/update-status', protect, authorizeRoles('deliveryMan'), deliveryManController.updateOrderStatus);

module.exports = router;
