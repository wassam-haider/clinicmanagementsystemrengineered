const request = require('supertest');

jest.mock('../src/models/user', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}));

const app = require('../src/app');
const User = require('../src/models/user');

const testUser = {
  _id: 'user-1',
  name: 'Test Admin',
  email: 'testadmin@example.com',
  password: 'Password123!',
  role: 'admin',
};

const findByIdResult = {
  select: jest.fn().mockImplementation(function() { return this; }),
  then: jest.fn().mockImplementation(function(onFulfilled) {
    return Promise.resolve(testUser).then(onFulfilled);
  }),
};

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockReturnValue(findByIdResult);
});

describe('Authentication API Endpoints', () => {
  // Test 1
  it('should register a new user successfully', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(testUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
        role: testUser.role,
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toEqual(testUser.email);
  });

  // Test 2
  it('should reject registration with existing email', async () => {
    User.findOne.mockResolvedValue(testUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('User already exists');
  });

  // Test 3
  it('should reject registration when creation fails', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockRejectedValue(new Error('ValidationError'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toEqual(500);
  });

  // Test 4
  it('should reject registration with invalid fields (e.g. missing name)', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(null); // User.create returns null if fails

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toEqual('Invalid user data');
  });

  // Test 5
  it('should login the registered user', async () => {
    User.findOne.mockResolvedValue({
      ...testUser,
      comparePassword: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  // Test 6
  it('should reject login with wrong password', async () => {
    User.findOne.mockResolvedValue({
      ...testUser,
      comparePassword: jest.fn().mockResolvedValue(false),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });

    expect(res.statusCode).toEqual(401);
  });

  // Test 7
  it('should reject login for non-existent user', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@example.com',
        password: 'Password123!',
      });

    expect(res.statusCode).toEqual(401);
  });

  // Test 8
  it('should get current user profile successfully', async () => {
    const token = require('jsonwebtoken').sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.email).toEqual(testUser.email);
  });
});
