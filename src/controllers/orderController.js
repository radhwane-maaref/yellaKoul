const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/Food'); // Import FoodItem for reorder logic
const User = require('../models/User'); // Assuming User model is needed for restaurant details
const { assignOrderToDriver } = require('../services/orderAssignmentService'); // Import the assignment service
const { body, validationResult } = require('express-validator'); // Import express-validator

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const order = await Order.create(req.body);
        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// @desc    Checkout cart and create an order
// @route   POST /api/orders/checkout
// @access  Private (Authenticated User)
exports.checkoutOrder = [
    body('deliveryAddress').optional().isObject().withMessage('Delivery address must be an object'),
    body('deliveryAddress.street').optional().notEmpty().withMessage('Street address is required'),
    body('deliveryAddress.city').optional().notEmpty().withMessage('City is required'),
    body('deliveryAddress.state').optional().notEmpty().withMessage('State is required'),
    body('deliveryAddress.zip').optional().notEmpty().withMessage('Zip code is required'),
    body('deliveryAddress.coordinates').optional().isArray({ min: 2, max: 2 }).withMessage('Coordinates must be an array of [longitude, latitude]'),
    body('deliveryAddress.coordinates.*').optional().isFloat().withMessage('Coordinates must be numbers'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { deliveryAddress } = req.body; // Expecting deliveryAddress from frontend

        try {
            const cart = await Cart.findOne({ user_id: req.user._id }).populate('items.food_item_id');

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({ message: 'Cart is empty' });
            }

            // Get restaurant ID from the first item in the cart (assuming all items are from one restaurant)
            const restaurantId = cart.items[0].food_item_id.restaurant_id;
            const restaurant = await Restaurant.findById(restaurantId);

            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found for items in cart' });
            }

            // Create order items from cart items
            const orderItems = cart.items.map(item => ({
                food_item_id: item.food_item_id._id,
                quantity: item.quantity,
                price_at_time_of_addition: item.price_item.price_at_time_of_addition,
            }));

            const order = await Order.create({
                user_id: req.user._id,
                restaurant_id: restaurantId,
                items: orderItems,
                total_price: cart.total_price,
                delivery_address: deliveryAddress || req.user.address, // Use provided address or user's default
                status: 'Pending',
            });

            // Clear the user's cart after checkout
            cart.items = [];
            cart.total_price = 0;
            await cart.save();

            // Initiate automatic driver assignment
            assignOrderToDriver(order._id, req.app.io); // Pass io instance
            res.status(201).json(order);

        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Get authenticated user's order history
// @route   GET /api/orders/history
// @access  Private
exports.getOrderHistory = async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user._id })
            .populate('restaurant_id', 'name address')
            .populate('items.food_item_id', 'name price image_url')
            .sort({ created_at: -1 }); // Latest orders first
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reorder a past order
// @route   POST /api/orders/:id/reorder
// @access  Private
exports.reorderPastOrder = async (req, res) => {
    try {
        const pastOrder = await Order.findById(req.params.id);

        if (!pastOrder) {
            return res.status(404).json({ message: 'Past order not found' });
        }

        if (pastOrder.user_id.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to reorder this order' });
        }

        // Check if restaurant is open and items are available
        const restaurant = await Restaurant.findById(pastOrder.restaurant_id);
        if (!restaurant || !restaurant.is_open) {
            return res.status(400).json({ message: 'Restaurant is currently closed or not available' });
        }

        let newOrderItems = [];
        let newTotalPrice = 0;

        for (const item of pastOrder.items) {
            const foodItem = await FoodItem.findById(item.food_item_id);
            if (!foodItem || !foodItem.is_available) {
                return res.status(400).json({ message: `Item ${foodItem ? foodItem.name : 'unknown'} is no longer available` });
            }
            newOrderItems.push({
                food_item_id: foodItem._id,
                quantity: item.quantity,
                price_at_time_of_order: foodItem.price, // Use current price
            });
            newTotalPrice += foodItem.price * item.quantity;
        }

        const newOrder = await Order.create({
            user_id: req.user._id,
            restaurant_id: pastOrder.restaurant_id,
            items: newOrderItems,
            total_price: newTotalPrice,
            delivery_address: pastOrder.delivery_address,
            status: 'Pending',
        });

        // Trigger automatic driver assignment for newOrder
        assignOrderToDriver(newOrder._id, req.app.io);

        res.status(201).json(newOrder);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all orders
exports.getOrders = async (req, res) => {
    const orders = await Order.find().populate('user_id').populate('restaurant_id').populate('delivery_man_id').populate('items.food_item_id');
    res.json(orders);
};

// Get a single order by ID
exports.getOrderById = async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user_id').populate('restaurant_id').populate('delivery_man_id').populate('items.food_item_id');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
};

// Update an order
exports.updateOrder = [
    body('status').optional().isIn(['Pending', 'Accepted', 'Preparing', 'Ready for Pickup', 'In Delivery', 'Delivered', 'Cancelled', 'Declined']).withMessage('Invalid order status'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!order) return res.status(404).json({ message: 'Order not found' });
            res.json(order);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
];

// Delete an order
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json({ message: 'Order deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
