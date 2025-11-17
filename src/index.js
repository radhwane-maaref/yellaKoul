require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); // Import rateLimit
const http = require('http'); // Import http module
const { Server } = require('socket.io'); // Import Server from socket.io
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const server = http.createServer(app); // Create http server using express app

// Configure CORS options
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*']; // Default to all for dev

const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};

const io = new Server(server, {
    cors: corsOptions // Apply CORS options to Socket.IO
}); // Initialize socket.io

app.use(cors(corsOptions)); // Apply CORS options to Express app
app.use(helmet());

// Apply general rate limiting to all requests
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(apiLimiter);

// Apply stricter rate limiting to authentication routes
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts from this IP, please try again after 5 minutes',
});
app.use('/users/register', authLimiter);
app.use('/users/login', authLimiter);

// Import routes
const foodRoutes = require('./routes/foodRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const deliveryManRoutes = require('./routes/deliveryManRoutes');

// Use routes
app.use('/foods', foodRoutes);
app.use('/orders', orderRoutes);
app.use('/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/deliverymen', deliveryManRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info(`A user connected: ${socket.id}`);

    // Make io accessible in routes
    app.use((req, res, next) => {
        req.app.io = io;
        next();
    });

    socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.id}`);
    });

    // Example: Delivery man joins a room
    socket.on('joinDeliveryRoom', (deliveryManId) => {
        socket.join(`deliveryMan-${deliveryManId}`);
        logger.info(`Delivery man ${deliveryManId} joined their room`);
    });

    // Example: Client joins a room to track their order
    socket.on('joinOrderRoom', (orderId) => {
        socket.join(`order-${orderId}`);
        logger.info(`Client joined room for order ${orderId}`);
    });

    // Example: Delivery man sends location update
    socket.on('updateLocation', (data) => {
        // data: { deliveryManId, latitude, longitude, orderId }
        // In a real app, you'd validate deliveryManId and update DB
        logger.info(`Delivery man ${data.deliveryManId} updated location: ${data.latitude}, ${data.longitude}`);
        // Emit to clients tracking this order
        if (data.orderId) {
            io.to(`order-${data.orderId}`).emit('driverLocationUpdate', {
                deliveryManId: data.deliveryManId,
                latitude: data.latitude,
                longitude: data.longitude
            });
        }
    });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info('✅ MongoDB connected'))
    .catch(err => logger.error('❌ MongoDB connection error:', err));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => logger.info(`Server running on port ${PORT}`)); // Use server.listen instead of app.listen
