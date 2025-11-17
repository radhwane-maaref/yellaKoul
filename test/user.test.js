const { expect } = require('chai');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
    // Connect to a test database before running tests
    before(async () => {
        await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test_food_delivery', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    // Clear the User collection before each test
    beforeEach(async () => {
        await User.deleteMany({});
    });

    // Disconnect from the test database after all tests are done
    after(async () => {
        await mongoose.connection.close();
    });

    it('should hash password before saving', async () => {
        const user = new User({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            role: 'client',
        });
        await user.save();
        expect(user.password).to.not.equal('password123');
        expect(user.password).to.be.a('string');
        expect(user.password.length).to.be.above(50); // Hashed passwords are long
    });

    it('should correctly match password', async () => {
        const user = new User({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            role: 'client',
        });
        await user.save();

        const isMatch = await user.matchPassword('password123');
        expect(isMatch).to.be.true;
    });

    it('should not match incorrect password', async () => {
        const user = new User({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            role: 'client',
        });
        await user.save();

        const isMatch = await user.matchPassword('wrongpassword');
        expect(isMatch).to.be.false;
    });

    it('should not hash password if not modified', async () => {
        const user = new User({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            role: 'client',
        });
        await user.save();

        const originalPassword = user.password;
        user.name = 'Updated Name';
        await user.save();

        expect(user.password).to.equal(originalPassword);
    });
});
