const Client = require('../models/Client');

// Create new client
exports.createClient = async (req, res) => {
    try {
        const client = await Client.create(req.body);
        res.status(201).json(client);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get all clients
exports.getClients = async (req, res) => {
    const clients = await Client.find();
    res.json(clients);
};

// Get a single client by ID
exports.getClientById = async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
};

// Update a client
exports.updateClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete a client
exports.deleteClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json({ message: 'Client deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
