const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/Food');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// @desc    Create a new restaurant (linked to a user with 'restaurant' role)
// @route   POST /api/restaurants
// @access  Private/Restaurant
exports.createRestaurant = [
    body('name').notEmpty().withMessage('Restaurant name is required'),
    body('address.street').notEmpty().withMessage('Street address is required'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('address.state').notEmpty().withMessage('State is required'),
    body('address.zip').notEmpty().withMessage('Zip code is required'),
    body('address.coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordinates must be an array of [longitude, latitude]'),
    body('address.coordinates.*').isFloat().withMessage('Coordinates must be numbers'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, cuisine_type, address } = req.body;

        try {
            // Check if the authenticated user is a restaurant and doesn't already have a restaurant profile
            if (req.user.role !== 'restaurant') {
                return res.status(403).json({ message: 'Only restaurant users can create a restaurant profile' });
            }
            const existingRestaurant = await Restaurant.findOne({ user_id: req.user._id });
            if (existingRestaurant) {
                return res.status(400).json({ message: 'Restaurant profile already exists for this user' });
            }

            const restaurant = await Restaurant.create({
                user_id: req.user._id,
                name,
                description,
                cuisine_type,
                address: {
                    street: address.street,
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                    coordinates: {
                        type: 'Point',
                        coordinates: address.coordinates,
                    },
                },
            });

            res.status(201).json(restaurant);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
exports.getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find().populate('user_id', 'name email');
        res.status(200).json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single restaurant by ID
// @route   GET /api/restaurants/:id
// @access  Public
exports.getRestaurantById = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).populate('user_id', 'name email');
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        res.status(200).json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update restaurant profile
// @route   PUT /api/restaurants/:id
// @access  Private/Restaurant
exports.updateRestaurant = [
    body('name').optional().notEmpty().withMessage('Restaurant name cannot be empty'),
    body('address.street').optional().notEmpty().withMessage('Street address cannot be empty'),
    body('address.city').optional().notEmpty().withMessage('City cannot be empty'),
    body('address.state').optional().notEmpty().withMessage('State cannot be empty'),
    body('address.zip').optional().notEmpty().withMessage('Zip code cannot be empty'),
    body('address.coordinates').optional().isArray({ min: 2, max: 2 }).withMessage('Coordinates must be an array of [longitude, latitude]'),
    body('address.coordinates.*').optional().isFloat().withMessage('Coordinates must be numbers'),
    body('is_open').optional().isBoolean().withMessage('is_open must be a boolean'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, cuisine_type, address, is_open } = req.body;

        try {
            const restaurant = await Restaurant.findById(req.params.id);

            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }

            // Ensure the authenticated user owns this restaurant profile
            if (restaurant.user_id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this restaurant' });
            }

            restaurant.name = name || restaurant.name;
            restaurant.description = description || restaurant.description;
            restaurant.cuisine_type = cuisine_type || restaurant.cuisine_type;
            if (address) {
                restaurant.address.street = address.street || restaurant.address.street;
                restaurant.address.city = address.city || restaurant.address.city;
                restaurant.address.state = address.state || restaurant.address.state;
                restaurant.address.zip = address.zip || restaurant.address.zip;
                if (address.coordinates) {
                    restaurant.address.coordinates = {
                        type: 'Point',
                        coordinates: address.coordinates,
                    };
                }
            }
            restaurant.is_open = is_open !== undefined ? is_open : restaurant.is_open;

            const updatedRestaurant = await restaurant.save();
            res.status(200).json(updatedRestaurant);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Delete restaurant profile
// @route   DELETE /api/restaurants/:id
// @access  Private/Restaurant
exports.deleteRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Ensure the authenticated user owns this restaurant profile
        if (restaurant.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this restaurant' });
        }

        await restaurant.deleteOne(); // Use deleteOne() for Mongoose 6+
        res.status(200).json({ message: 'Restaurant removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update restaurant open/close status
// @route   PATCH /api/restaurants/status
// @access  Private/Restaurant
exports.updateRestaurantStatus = [
    body('is_open').isBoolean().withMessage('is_open must be a boolean'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { is_open } = req.body;

        try {
            const restaurant = await Restaurant.findOne({ user_id: req.user._id });

            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant profile not found for this user' });
            }

            restaurant.is_open = is_open;
            const updatedRestaurant = await restaurant.save();
            res.status(200).json(updatedRestaurant);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Create a new food item for the authenticated restaurant
// @route   POST /api/restaurants/:restaurantId/food
// @access  Private/Restaurant
exports.createFoodItem = [
    body('name').notEmpty().withMessage('Food item name is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
    body('category').notEmpty().withMessage('Category is required'),
    body('is_available').optional().isBoolean().withMessage('is_available must be a boolean'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, price, category, image_url, is_available } = req.body;
        const { restaurantId } = req.params;

        try {
            const restaurant = await Restaurant.findById(restaurantId);

            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }

            // Ensure the authenticated user owns this restaurant
            if (restaurant.user_id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to add food to this restaurant' });
            }

            const foodItem = await FoodItem.create({
                restaurant_id: restaurantId,
                name,
                description,
                price,
                category,
                image_url,
                is_available,
            });

            res.status(201).json(foodItem);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Get all food items for a specific restaurant
// @route   GET /api/restaurants/:restaurantId/food
// @access  Public
exports.getFoodItemsByRestaurant = async (req, res) => {
    try {
        const foodItems = await FoodItem.find({ restaurant_id: req.params.restaurantId });
        res.status(200).json(foodItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single food item by ID
// @route   GET /api/restaurants/:restaurantId/food/:foodItemId
// @access  Public
exports.getFoodItemById = async (req, res) => {
    try {
        const foodItem = await FoodItem.findById(req.params.foodItemId);
        if (!foodItem) {
            return res.status(404).json({ message: 'Food item not found' });
        }
        res.status(200).json(foodItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a food item
// @route   PUT /api/restaurants/:restaurantId/food/:foodItemId
// @access  Private/Restaurant
exports.updateFoodItem = [
    body('name').optional().notEmpty().withMessage('Food item name cannot be empty'),
    body('price').optional().isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
    body('is_available').optional().isBoolean().withMessage('is_available must be a boolean'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, price, category, image_url, is_available } = req.body;
        const { restaurantId, foodItemId } = req.params;

        try {
            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }
            if (restaurant.user_id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update food for this restaurant' });
            }

            const foodItem = await FoodItem.findById(foodItemId);
            if (!foodItem) {
                return res.status(404).json({ message: 'Food item not found' });
            }
            if (foodItem.restaurant_id.toString() !== restaurantId) {
                return res.status(400).json({ message: 'Food item does not belong to this restaurant' });
            }

            foodItem.name = name || foodItem.name;
            foodItem.description = description || foodItem.description;
            foodItem.price = price || foodItem.price;
            foodItem.category = category || foodItem.category;
            foodItem.image_url = image_url || foodItem.image_url;
            foodItem.is_available = is_available !== undefined ? is_available : foodItem.is_available;

            const updatedFoodItem = await foodItem.save();
            res.status(200).json(updatedFoodItem);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Delete a food item
// @route   DELETE /api/restaurants/:restaurantId/food/:foodItemId
// @access  Private/Restaurant
exports.deleteFoodItem = async (req, res) => {
    const { restaurantId, foodItemId } = req.params;

    try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        if (restaurant.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete food from this restaurant' });
        }

        const foodItem = await FoodItem.findById(foodItemId);
        if (!foodItem) {
            return res.status(404).json({ message: 'Food item not found' });
        }
        if (foodItem.restaurant_id.toString() !== restaurantId) {
            return res.status(400).json({ message: 'Food item does not belong to this restaurant' });
        }

        await foodItem.deleteOne();
        res.status(200).json({ message: 'Food item removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};