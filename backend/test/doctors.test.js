const request = require('supertest');

jest.mock('../src/models/user', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/doctor', () => ({
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
const Doctor = require('../src/models/doctor');

const authUser = {
  _id: 'user-1',
  id: 'user-1',
  name: 'Doctor Admin',
  email: 'doctoradmin@example.com',
  role: 'admin',
};

const findByIdResult = {
  select: jest.fn().mockResolvedValue(authUser),
};

const mockDoctor = {
  _id: 'doctor-ObjectId',
  doctorId: 'D50001',
  name: 'Dr. Ayesha Khan',
  specialization: 'Cardiology',
};

const mockFindChain = {
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([mockDoctor]),
};

beforeEach(() => {
  jest.clearAllMocks();
  findByIdResult.select.mockResolvedValue(authUser);
  User.findById.mockReturnValue(findByIdResult);
  Doctor.aggregate.mockReturnValue({
    exec: jest.fn().mockResolvedValue([{ numericPart: 50000 }]),
  });
  Doctor.countDocuments.mockResolvedValue(1);
  Doctor.find.mockReturnValue(mockFindChain);
  Doctor.findOne.mockResolvedValue(mockDoctor);
  Doctor.findOneAndUpdate.mockResolvedValue(mockDoctor);
  Doctor.deleteOne.mockResolvedValue({ deletedCount: 1 });
});

describe('Doctors CRUD API Endpoints', () => {
  // Test 1
  it('should block unauthorized access', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.statusCode).toEqual(401);
  });

  // Test 2
  it('should create a new doctor when authenticated as admin/staff', async () => {
    Doctor.create.mockResolvedValue(mockDoctor);

    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Dr. Ayesha Khan',
        specialization: 'Cardiology',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.doctorId).toEqual('D50001');
  });

  // Test 3
  it('should reject doctor creation on validation failure', async () => {
    Doctor.create.mockRejectedValue({
      name: 'ValidationError',
      message: 'Doctor validation failed',
      errors: {
        name: { message: 'Name is required' },
      },
    });

    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        specialization: 'Cardiology',
      });

    expect(res.statusCode).toEqual(400);
  });

  // Test 4
  it('should get all doctors with pagination', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/doctors?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data[0].doctorId).toEqual('D50001');
  });

  // Test 5
  it('should search doctors by specialization', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/doctors?search=Cardiology')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Doctor.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.any(Array),
      })
    );
  });

  // Test 6
  it('should get doctor by ID', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/doctors/D50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.doctorId).toEqual('D50001');
  });

  // Test 7
  it('should update doctor details successfully', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .put('/api/doctors/D50001')
      .set('Authorization', `Bearer ${token}`)
      .send({ specialization: 'Neurology' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  // Test 8
  it('should delete doctor when user is admin', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .delete('/api/doctors/D50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('deleted successfully');
  });
});
