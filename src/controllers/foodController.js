const Food = require('../models/Food');

// Create new food
exports.createFood = async (req, res) => {
    try {
        const food = await Food.create(req.body);
        res.status(201).json(food);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get all food
exports.getFoods = async (req, res) => {
    const foods = await Food.find();
    res.json(foods);
};

// Get a single food by ID
exports.getFoodById = async (req, res) => {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Food not found' });
    res.json(food);
};

// Update a food
exports.updateFood = async (req, res) => {
    try {
        const food = await Food.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!food) return res.status(404).json({ message: 'Food not found' });
        res.json(food);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete a food
exports.deleteFood = async (req, res) => {
    try {
        const food = await Food.findByIdAndDelete(req.params.id);
        if (!food) return res.status(404).json({ message: 'Food not found' });
        res.json({ message: 'Food deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
