const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../src/index'); // Assuming your app exports the express app
const User = require('../src/models/User');

describe('Auth Endpoints', () => {
    before(async () => {
        // Connect to a test database
        await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test_food_delivery', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    beforeEach(async () => {
        // Clear the User collection before each test
        await User.deleteMany({});
    });

    after(async () => {
        // Disconnect from the test database after all tests are done
        await mongoose.connection.close();
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/users/register')
            .send({
                name: 'Test User',
                email: 'register@example.com',
                password: 'password123',
                role: 'client',
                phone_number: '1234567890',
                address: {
                    street: '1 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zip: '12345',
                    coordinates: [-74.0060, 40.7128]
                }
            });

        expect(res.statusCode).to.equal(201);
        expect(res.body).to.have.property('_id');
        expect(res.body).to.have.property('token');
        expect(res.body.email).to.equal('register@example.com');
    });

    it('should not register a user with existing email', async () => {
        await User.create({
            name: 'Existing User',
            email: 'existing@example.com',
            password: 'password123',
            role: 'client',
        });

        const res = await request(app)
            .post('/users/register')
            .send({
                name: 'Another User',
                email: 'existing@example.com',
                password: 'password123',
                role: 'client',
            });

        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal('User already exists');
    });

    it('should log in an existing user', async () => {
        await User.create({
            name: 'Login User',
            email: 'login@example.com',
            password: 'password123',
            role: 'client',
        });

        const res = await request(app)
            .post('/users/login')
            .send({
                email: 'login@example.com',
                password: 'password123',
            });

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.have.property('_id');
        expect(res.body).to.have.property('token');
        expect(res.body.email).to.equal('login@example.com');
    });

    it('should not log in with incorrect password', async () => {
        await User.create({
            name: 'Login User',
            email: 'badpass@example.com',
            password: 'password123',
            role: 'client',
        });

        const res = await request(app)
            .post('/users/login')
            .send({
                email: 'badpass@example.com',
                password: 'wrongpassword',
            });

        expect(res.statusCode).to.equal(401);
        expect(res.body.message).to.equal('Invalid email or password');
    });
});
