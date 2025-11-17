const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// Function to find the nearest available delivery man
const findNearestDriver = async (restaurantCoordinates, excludedDriverIds = []) => {
    try {
        const nearestDrivers = await User.find({
            role: 'deliveryMan',
            is_available: true,
            assigned_order_id: { $exists: false }, // Not currently assigned
            _id: { $nin: excludedDriverIds }, // Exclude drivers who declined this order
            current_location: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: restaurantCoordinates // [longitude, latitude]
                    },
                    $maxDistance: 50000 // Search within 50 km radius (adjust as needed)
                }
            }
        })
        .sort({ 'current_location.coordinates': 1 }) // Sort by distance (closest first)
        .limit(1) // Get only the nearest driver
        .select('_id name email current_location');

        return nearestDrivers.length > 0 ? nearestDrivers[0] : null;
    } catch (error) {
        console.error('Error finding nearest driver:', error);
        return null;
    }
};

// Function to assign an order to a driver
const assignOrderToDriver = async (orderId, io) => {
    try {
        const order = await Order.findById(orderId).populate('restaurant_id');

        if (!order) {
            console.log(`Order ${orderId} not found for assignment.`);
            return;
        }
        if (order.status !== 'Pending') {
            console.log(`Order ${orderId} is not in Pending status, skipping assignment.`);
            return;
        }

        const restaurantCoordinates = order.restaurant_id.address.coordinates;
        const excludedDriverIds = order.declined_by || [];

        const driver = await findNearestDriver(restaurantCoordinates, excludedDriverIds);

        if (driver) {
            order.delivery_man_id = driver._id;
            // Order status remains 'Pending' until driver accepts
            await order.save();

            // Update driver's assigned order
            driver.assigned_order_id = order._id;
            await driver.save();

            // Notify the driver via Socket.IO
            io.to(`deliveryMan-${driver._id.toString()}`).emit('newOrderNotification', order);
            console.log(`Order ${orderId} assigned to driver ${driver._id}. Notification sent.`);

            // Set a timeout for driver response (e.g., 60 seconds)
            setTimeout(async () => {
                const updatedOrder = await Order.findById(orderId);
                if (updatedOrder && updatedOrder.status === 'Pending' && updatedOrder.delivery_man_id.toString() === driver._id.toString()) {
                    // Driver did not respond in time, treat as decline
                    console.log(`Driver ${driver._id} timed out for order ${orderId}. Reassigning.`);
                    updatedOrder.declined_by.push(driver._id);
                    updatedOrder.delivery_man_id = undefined;
                    await updatedOrder.save();

                    // Clear driver's assigned order
                    driver.assigned_order_id = undefined;
                    await driver.save();

                    // Attempt re-assignment
                    assignOrderToDriver(orderId, io);
                }
            }, 60000); // 60 seconds timeout
        } else {
            console.log(`No available drivers found for order ${orderId}.`);
            // Optionally, notify restaurant/admin that no driver was found
            // order.status = 'Unassigned'; // Or some other status
            // await order.save();
        }
    } catch (error) {
        console.error(`Error assigning order ${orderId}:`, error);
    }
};

module.exports = {
    findNearestDriver,
    assignOrderToDriver,
};
