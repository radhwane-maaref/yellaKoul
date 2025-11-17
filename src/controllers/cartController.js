const Cart = require('../models/Cart');
const FoodItem = require('../models/Food');
const { body, validationResult } = require('express-validator');

// Helper function to get or create a cart
const getOrCreateCart = async (req) => {
    let cart;
    if (req.user) {
        // Authenticated user
        cart = await Cart.findOne({ user_id: req.user._id });
        if (!cart) {
            cart = await Cart.create({ user_id: req.user._id });
        }
    } else {
        // Guest user (using session_id from cookie/header)
        const sessionId = req.headers['x-session-id']; // Assuming session ID is passed in a header
        if (!sessionId) {
            // Generate a new session ID if not present
            const newSessionId = require('crypto').randomBytes(16).toString('hex');
            req.sessionId = newSessionId; // Attach to request for response header
            cart = await Cart.create({ session_id: newSessionId });
        } else {
            cart = await Cart.findOne({ session_id: sessionId });
            if (!cart) {
                cart = await Cart.create({ session_id: newSessionId }); // Use newSessionId if not found
            }
        }
    }
    return cart;
};

// @desc    Get user/guest cart
// @route   GET /api/cart
// @access  Public (but can be protected for authenticated users)
exports.getCart = async (req, res) => {
    try {
        const cart = await getOrCreateCart(req);
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Public
exports.addItemToCart = [
    body('foodItemId').isMongoId().withMessage('Invalid Food Item ID'),
    body('quantity').isInt({ gt: 0 }).withMessage('Quantity must be a positive integer'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { foodItemId, quantity } = req.body;

        try {
            const foodItem = await FoodItem.findById(foodItemId);
            if (!foodItem) {
                return res.status(404).json({ message: 'Food item not found' });
            }

            let cart = await getOrCreateCart(req);

            const itemIndex = cart.items.findIndex(item => item.food_item_id.toString() === foodItemId);

            if (itemIndex > -1) {
                // Item exists in cart, update quantity
                cart.items[itemIndex].quantity += quantity;
            } else {
                // Item does not exist in cart, add new item
                cart.items.push({
                    food_item_id: foodItemId,
                    quantity,
                    price_at_time_of_addition: foodItem.price,
                });
            }

            await cart.save();
            res.status(200).json(cart);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Remove item from cart
// @route   POST /api/cart/remove
// @access  Protected
exports.removeItemFromCart = [
    body('foodItemId').isMongoId().withMessage('Invalid Food Item ID'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { foodItemId } = req.body;

        try {
            let cart = await getOrCreateCart(req);

            cart.items = cart.items.filter(item => item.food_item_id.toString() !== foodItemId);

            await cart.save();
            res.status(200).json(cart);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Update cart item quantity
// @route   PATCH /api/cart/update-quantity
// @access  Protected
exports.updateCartItemQuantity = [
    body('foodItemId').isMongoId().withMessage('Invalid Food Item ID'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { foodItemId, quantity } = req.body;

        try {
            let cart = await getOrCreateCart(req);

            const itemIndex = cart.items.findIndex(item => item.food_item_id.toString() === foodItemId);

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity = quantity;
                if (cart.items[itemIndex].quantity <= 0) {
                    cart.items.splice(itemIndex, 1); // Remove if quantity is 0 or less
                }
            } else {
                return res.status(404).json({ message: 'Food item not found in cart' });
            }

            await cart.save();
            res.status(200).json(cart);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Protected
exports.clearCart = async (req, res) => {
    try {
        let cart = await getOrCreateCart(req);
        cart.items = [];
        await cart.save();
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
