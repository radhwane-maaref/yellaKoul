const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.route('/me').get(protect, userController.getUserProfile).put(protect, userController.updateUserProfile);

// Delivery Man specific routes
router.patch('/deliverymen/status', protect, authorizeRoles('deliveryMan'), userController.updateDeliveryManStatus);
router.post('/deliverymen/location', protect, authorizeRoles('deliveryMan'), userController.updateDeliveryManLocation);

module.exports = router;
