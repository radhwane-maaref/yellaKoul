# Food Delivery Backend Application

## Project Description
This is a robust backend application for a food delivery service, built with Node.js, Express.js, and MongoDB. It supports multiple user roles (client, restaurant, delivery man) and includes features such as user authentication, cart management, order processing, real-time delivery tracking, and restaurant administration.

## Core Features

*   **Guest/User Cart:** Users can add food items to a cart, even as guests. Authenticated users have persistent carts.
*   **Order Checkout:** Secure checkout process with authentication checks.
*   **Order History:** Registered users can view past orders and reorder items.
*   **Restaurant Admin Dashboard:** Restaurants can manage their food menus (CRUD operations) and update their open/close status.
*   **Delivery Man Status & Location:** Delivery staff can set availability, update real-time location, and manage assigned orders.
*   **Automatic Order Assignment:** New orders are automatically assigned to the nearest available delivery person, with re-assignment logic if a driver declines.
*   **Real-time Updates:** Utilizes Socket.IO for real-time location tracking and order notifications.

## Technologies Used

*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB (Mongoose ODM)
*   **Authentication:** JSON Web Tokens (JWT), bcryptjs for password hashing
*   **Validation:** express-validator
*   **Security:** Helmet, CORS, express-rate-limit
*   **Real-time:** Socket.IO
*   **Testing:** Mocha, Chai, Supertest
*   **Logging:** Winston

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd projet_integration
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the root directory and add the following environment variables:
    ```
    PORT=3000
    MONGO_URI=mongodb://localhost:27017/food_delivery_app
    JWT_SECRET=your_jwt_secret_key_here
    ALLOWED_ORIGINS=http://localhost:3001,http://yourfrontend.com # Comma-separated list of allowed origins, or leave empty for '*' in development
    ```
    *   `MONGO_URI`: Your MongoDB connection string.
    *   `JWT_SECRET`: A strong, random string for signing JWTs.
    *   `ALLOWED_ORIGINS`: Comma-separated list of frontend URLs allowed to access your API. Use `*` for development, but restrict in production.

## Running the Application

*   **Start the development server:**
    ```bash
    npm start
    ```
    The server will run on the `PORT` specified in your `.env` file (default: 3000).

## Testing

*   **Run tests:**
    ```bash
    npm test
    ```
    This will execute unit and integration tests using Mocha. Ensure your `MONGO_URI_TEST` in `package.json` points to a separate test database.

## API Endpoints (Overview)

All API endpoints are prefixed with `/api`.

*   **Authentication:**
    *   `POST /users/register`
    *   `POST /users/login`
    *   `GET /users/me` (Protected)
    *   `PUT /users/me` (Protected)
*   **Cart Management:**
    *   `GET /api/cart` (Protected/Guest)
    *   `POST /api/cart/add` (Protected/Guest)
    *   `POST /api/cart/remove` (Protected)
    *   `PATCH /api/cart/update-quantity` (Protected)
    *   `DELETE /api/cart` (Protected)
*   **Order Management (Client):**
    *   `POST /api/orders/checkout` (Protected)
    *   `GET /api/orders/history` (Protected)
    *   `POST /api/orders/:id/reorder` (Protected)
*   **Restaurant Admin:**
    *   `POST /api/restaurants` (Protected, Restaurant Role)
    *   `GET /api/restaurants` (Public)
    *   `GET /api/restaurants/:id` (Public)
    *   `PUT /api/restaurants/:id` (Protected, Restaurant Role)
    *   `PATCH /api/restaurants/status` (Protected, Restaurant Role)
    *   `POST /api/restaurants/:restaurantId/food` (Protected, Restaurant Role)
    *   `GET /api/restaurants/:restaurantId/food` (Public)
    *   `GET /api/restaurants/:restaurantId/food/:foodItemId` (Public)
    *   `PUT /api/restaurants/:restaurantId/food/:foodItemId` (Protected, Restaurant Role)
    *   `DELETE /api/restaurants/:restaurantId/food/:foodItemId` (Protected, Restaurant Role)
*   **Delivery Man:**
    *   `PATCH /users/deliverymen/status` (Protected, DeliveryMan Role)
    *   `POST /users/deliverymen/location` (Protected, DeliveryMan Role)
    *   `GET /api/deliverymen/orders/assigned` (Protected, DeliveryMan Role)
    *   `PATCH /api/deliverymen/orders/:orderId/accept` (Protected, DeliveryMan Role)
    *   `PATCH /api/deliverymen/orders/:orderId/decline` (Protected, DeliveryMan Role)
    *   `PATCH /api/deliverymen/orders/:orderId/update-status` (Protected, DeliveryMan Role)

## Environment Variables

*   `PORT`: Port for the server to listen on.
*   `MONGO_URI`: MongoDB connection string.
*   `JWT_SECRET`: Secret key for JWT signing.
*   `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (e.g., `http://localhost:3001,https://yourdomain.com`). If not set, defaults to `*` for development.
*   `MONGO_URI_TEST`: MongoDB connection string for the test database.

## CORS Configuration

CORS is configured to allow requests from origins specified in the `ALLOWED_ORIGINS` environment variable. In development, it defaults to allowing all origins. For production, it's crucial to set `ALLOWED_ORIGINS` to your specific frontend domains.

## Rate Limiting

*   **General API:** 100 requests per 15 minutes per IP.
*   **Authentication Routes (`/users/register`, `/users/login`):** 5 requests per 5 minutes per IP.

## Logging

The application uses Winston for structured logging. Logs are output to the console. In a production environment, you might configure Winston to log to files or a centralized logging service.

## Security Audit

*   **Run `npm audit`:**
    ```bash
    npm audit
    ```
    This command checks for known security vulnerabilities in your project's dependencies. It's recommended to run this regularly and address any reported issues.
