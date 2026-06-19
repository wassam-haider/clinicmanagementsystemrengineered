const request = require('supertest');

jest.mock('../src/models/user', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/patient', () => ({
  aggregate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
}));

const app = require('../src/app');
const User = require('../src/models/user');
const Patient = require('../src/models/patient');

const authUser = {
  _id: 'user-1',
  id: 'user-1',
  name: 'Patient Admin',
  email: 'patientadmin@example.com',
  role: 'admin',
};

const findByIdResult = {
  select: jest.fn().mockResolvedValue(authUser),
};

const mockPatient = {
  _id: 'patient-ObjectId',
  patientId: 'P50001',
  name: 'John Doe',
  age: 30,
  gender: 'Male',
  phone: '12345678901',
};

const mockFindChain = {
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([mockPatient]),
};

beforeEach(() => {
  jest.clearAllMocks();
  findByIdResult.select.mockResolvedValue(authUser);
  User.findById.mockReturnValue(findByIdResult);
  Patient.aggregate.mockReturnValue({
    exec: jest.fn().mockResolvedValue([{ numericPart: 50000 }]),
  });
  Patient.countDocuments.mockResolvedValue(1);
  Patient.find.mockReturnValue(mockFindChain);
  Patient.findOne.mockResolvedValue(mockPatient);
  Patient.findOneAndUpdate.mockResolvedValue(mockPatient);
  Patient.deleteOne.mockResolvedValue({ deletedCount: 1 });
});

describe('Patients CRUD API Endpoints', () => {
  // Test 1
  it('should block unauthorized access', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.statusCode).toEqual(401);
  });

  // Test 2
  it('should create a new patient when authenticated', async () => {
    Patient.create.mockResolvedValue(mockPatient);

    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'John Doe',
        age: 30,
        gender: 'Male',
        phone: '12345678901',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.patientId).toEqual('P50001');
  });

  // Test 3
  it('should reject patient creation when the model validation fails', async () => {
    Patient.create.mockRejectedValue({
      name: 'ValidationError',
      message: 'Patient validation failed',
      errors: {
        age: { message: 'Age must be positive' },
      },
    });

    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jane Doe',
        age: -5,
        gender: 'Female',
        phone: '12345678901',
      });

    expect(res.statusCode).toEqual(400);
  });

  // Test 4
  it('should get all patients with pagination', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/patients?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data[0].patientId).toEqual('P50001');
  });

  // Test 5
  it('should search patients by name', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/patients?search=John')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Patient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.any(Array),
      })
    );
  });

  // Test 6
  it('should get patient by ID', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/patients/P50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.patientId).toEqual('P50001');
  });

  // Test 7
  it('should update patient demographics successfully', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .put('/api/patients/P50001')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'John Updated' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  // Test 8
  it('should delete patient when user is admin', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .delete('/api/patients/P50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('deleted successfully');
  });
});
