const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    food_item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodItem',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price_at_time_of_addition: {
        type: Number,
        required: true,
    },
});

const cartSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    session_id: {
        type: String,
        unique: true,
        sparse: true, // Allows null values to not violate unique constraint
    },
    items: [cartItemSchema],
    total_price: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

// Pre-save hook to calculate total_price
cartSchema.pre('save', function (next) {
    this.total_price = this.items.reduce((acc, item) => acc + (item.quantity * item.price_at_time_of_addition), 0);
    next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
