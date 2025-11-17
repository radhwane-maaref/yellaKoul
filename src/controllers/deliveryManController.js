const Order = require('../models/Order');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// @desc    Get orders assigned to the authenticated delivery man
// @route   GET /api/deliverymen/orders/assigned
// @access  Private/DeliveryMan
exports.getAssignedOrders = async (req, res) => {
    try {
        const orders = await Order.find({ delivery_man_id: req.user._id, status: { $in: ['Accepted', 'Preparing', 'In Delivery'] } })
            .populate('user_id', 'name email phone_number address')
            .populate('restaurant_id', 'name address')
            .populate('items.food_item_id', 'name price');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delivery man accepts an order
// @route   PATCH /api/deliverymen/orders/:orderId/accept
// @access  Private/DeliveryMan
exports.acceptOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ message: 'Order is not in a pending state' });
        }

        // Ensure the order is not already assigned or accepted by another driver
        if (order.delivery_man_id && order.delivery_man_id.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: 'Order already assigned to another delivery man' });
        }

        order.delivery_man_id = req.user._id;
        order.status = 'Accepted';
        order.accepted_at = Date.now();
        await order.save();

        // Update delivery man's assigned order
        req.user.assigned_order_id = order._id;
        await req.user.save();

        res.status(200).json({ message: 'Order accepted successfully', order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delivery man declines an order
// @route   PATCH /api/deliverymen/orders/:orderId/decline
// @access  Private/DeliveryMan
exports.declineOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ message: 'Order is not in a pending state and cannot be declined' });
        }

        // Add delivery man to declined_by list
        if (!order.declined_by.includes(req.user._id)) {
            order.declined_by.push(req.user._id);
        }
        order.delivery_man_id = undefined; // Unassign the order
        await order.save();

        // TODO: Trigger re-assignment logic here (e.g., emit a socket event or call a service)

        res.status(200).json({ message: 'Order declined successfully', order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delivery man updates order status
// @route   PATCH /api/deliverymen/orders/:orderId/update-status
// @access  Private/DeliveryMan
exports.updateOrderStatus = [
    body('status').isIn(['Preparing', 'In Delivery', 'Delivered']).withMessage('Invalid status for order update'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { status } = req.body; // Expected status: 'Preparing', 'In Delivery', 'Delivered'

        try {
            const order = await Order.findById(req.params.orderId);

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Ensure the authenticated delivery man is assigned to this order
            if (!order.delivery_man_id || order.delivery_man_id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this order' });
            }

            // Validate status transition (optional but good practice)
            const validTransitions = {
                'Accepted': ['Preparing', 'In Delivery'],
                'Preparing': ['In Delivery'],
                'In Delivery': ['Delivered'],
            };

            if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
                return res.status(400).json({ message: `Invalid status transition from ${order.status} to ${status}` });
            }

            order.status = status;
            if (status === 'Delivered') {
                order.delivered_at = Date.now();
                // Clear delivery man's assigned order
                req.user.assigned_order_id = undefined;
                await req.user.save();
            }
            await order.save();

            // TODO: Emit socket event for real-time update to client/restaurant

            res.status(200).json({ message: `Order status updated to ${status}`, order });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];