const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.registerUser = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').isIn(['client', 'deliveryMan', 'restaurant']).withMessage('Invalid role specified'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, role, phone_number, address } = req.body;

        try {
            const userExists = await User.findOne({ email });

            if (userExists) {
                return res.status(400).json({ message: 'User already exists' });
            }

            const user = await User.create({
                name,
                email,
                password,
                role,
                phone_number,
                address,
            });

            if (user) {
                res.status(201).json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone_number: user.phone_number,
                    address: user.address,
                    token: generateToken(user._id),
                });
            } else {
                res.status(400).json({ message: 'Invalid user data' });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone_number: user.phone_number,
                address: user.address,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone_number: user.phone_number,
            address: user.address,
            is_available: user.is_available,
            current_location: user.current_location,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

exports.updateUserProfile = [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone_number').optional().notEmpty().withMessage('Phone number cannot be empty'),
    body('address.street').optional().notEmpty().withMessage('Street address cannot be empty'),
    body('address.city').optional().notEmpty().withMessage('City cannot be empty'),
    body('address.state').optional().notEmpty().withMessage('State cannot be empty'),
    body('address.zip').optional().notEmpty().withMessage('Zip code cannot be empty'),
    body('address.coordinates').optional().isArray({ min: 2, max: 2 }).withMessage('Coordinates must be an array of [longitude, latitude]'),
    body('address.coordinates.*').optional().isFloat().withMessage('Coordinates must be numbers'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone_number = req.body.phone_number || user.phone_number;
            if (req.body.address) {
                user.address.street = req.body.address.street || user.address.street;
                user.address.city = req.body.address.city || user.address.city;
                user.address.state = req.body.address.state || user.address.state;
                user.address.zip = req.body.address.zip || user.address.zip;
                if (req.body.address.coordinates) {
                    user.address.coordinates = {
                        type: 'Point',
                        coordinates: req.body.address.coordinates,
                    };
                }
            }

            if (req.body.password) {
                user.password = req.body.password; // Mongoose pre-save hook will hash this
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone_number: updatedUser.phone_number,
                address: updatedUser.address,
                is_available: updatedUser.is_available,
                current_location: updatedUser.current_location,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    }
];

// @desc    Update delivery man availability status
// @route   PATCH /api/deliverymen/status
// @access  Private/DeliveryMan
exports.updateDeliveryManStatus = [
    body('is_available').isBoolean().withMessage('is_available must be a boolean'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { is_available } = req.body;

        try {
            const user = await User.findById(req.user._id);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (user.role !== 'deliveryMan') {
                return res.status(403).json({ message: 'Not authorized as a delivery man' });
            }

            user.is_available = is_available;
            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                is_available: updatedUser.is_available,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

// @desc    Update delivery man real-time location
// @route   POST /api/deliverymen/location
// @access  Private/DeliveryMan
exports.updateDeliveryManLocation = [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a number between -90 and 90'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a number between -180 and 180'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { latitude, longitude } = req.body;

        try {
            const user = await User.findById(req.user._id);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (user.role !== 'deliveryMan') {
                return res.status(403).json({ message: 'Not authorized as a delivery man' });
            }

            user.current_location = {
                type: 'Point',
                coordinates: [longitude, latitude],
            };
            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                current_location: updatedUser.current_location,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];
