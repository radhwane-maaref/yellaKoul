const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Restaurant Admin specific routes
router.route('/')
    .post(protect, authorizeRoles('restaurant'), restaurantController.createRestaurant)
    .get(restaurantController.getAllRestaurants); // Public route to get all restaurants

router.route('/:id')
    .get(restaurantController.getRestaurantById) // Public route to get a single restaurant
    .put(protect, authorizeRoles('restaurant'), restaurantController.updateRestaurant)
    .delete(protect, authorizeRoles('restaurant'), restaurantController.deleteRestaurant);

router.patch('/status', protect, authorizeRoles('restaurant'), restaurantController.updateRestaurantStatus);

// Food Item CRUD for a specific restaurant
router.route('/:restaurantId/food')
    .post(protect, authorizeRoles('restaurant'), restaurantController.createFoodItem)
    .get(restaurantController.getFoodItemsByRestaurant); // Public route to get food items

router.route('/:restaurantId/food/:foodItemId')
    .get(restaurantController.getFoodItemById) // Public route to get a single food item
    .put(protect, authorizeRoles('restaurant'), restaurantController.updateFoodItem)
    .delete(protect, authorizeRoles('restaurant'), restaurantController.deleteFoodItem);

module.exports = router;
