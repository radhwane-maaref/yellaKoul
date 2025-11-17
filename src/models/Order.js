const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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
    price_at_time_of_order: {
        type: Number,
        required: true,
    },
});

const orderSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    delivery_man_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    items: [orderItemSchema],
    total_price: {
        type: Number,
        required: true,
    },
    delivery_address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        coordinates: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
            },
        },
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Preparing', 'Ready for Pickup', 'In Delivery', 'Delivered', 'Cancelled', 'Declined'],
        default: 'Pending',
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    accepted_at: {
        type: Date,
    },
    delivered_at: {
        type: Date,
    },
    declined_by: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, {
    timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;