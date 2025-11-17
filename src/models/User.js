const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['client', 'deliveryMan', 'restaurant'],
        required: true,
    },
    phone_number: {
        type: String,
    },
    address: {
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
                index: '2dsphere', // Create a geospatial index
            },
        },
    },
    is_available: {
        type: Boolean,
        default: false,
    },
    current_location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere', // Create a geospatial index
        },
    },
    assigned_order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt timestamps
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
