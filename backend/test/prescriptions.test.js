const request = require('supertest');

jest.mock('../src/models/user', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/prescription', () => ({
  aggregate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
}));

jest.mock('../src/models/patient', () => ({
  findOne: jest.fn(),
}));

const app = require('../src/app');
const User = require('../src/models/user');
const Prescription = require('../src/models/prescription');
const Patient = require('../src/models/patient');

const adminUser = {
  _id: 'user-admin',
  id: 'user-admin',
  name: 'Prescription Admin',
  email: 'prescadmin@example.com',
  role: 'admin',
};

const staffUser = {
  _id: 'user-staff',
  id: 'user-staff',
  name: 'Prescription Staff',
  email: 'prescstaff@example.com',
  role: 'staff',
};

const findByIdResult = {
  select: jest.fn(),
};

const mockPrescription = {
  _id: 'prescription-ObjectId',
  prescriptionId: 'PR50001',
  patientId: 'P50001',
  medicine: 'Paracetamol 500mg twice daily',
};

const mockFindQuery = {
  populate: jest.fn().mockImplementation(() => mockFindQuery),
  sort: jest.fn().mockImplementation(() => mockFindQuery),
  skip: jest.fn().mockImplementation(() => mockFindQuery),
  limit: jest.fn().mockImplementation(() => mockFindQuery),
  then: jest.fn().mockImplementation((onResolve) => Promise.resolve([mockPrescription]).then(onResolve)),
};

const mockFindOneQuery = {
  populate: jest.fn().mockImplementation(() => mockFindOneQuery),
  then: jest.fn().mockImplementation((onResolve) => Promise.resolve(mockPrescription).then(onResolve)),
};

beforeEach(() => {
  jest.clearAllMocks();
  findByIdResult.select.mockResolvedValue(adminUser);
  User.findById.mockReturnValue(findByIdResult);
  Prescription.aggregate.mockReturnValue({
    exec: jest.fn().mockResolvedValue([{ numericPart: 50000 }]),
  });
  Prescription.countDocuments.mockResolvedValue(1);
  Prescription.find.mockReturnValue(mockFindQuery);
  Prescription.findOne.mockReturnValue(mockFindOneQuery);
  Prescription.findOneAndUpdate.mockReturnValue(mockFindOneQuery);
  Prescription.deleteOne.mockResolvedValue({ deletedCount: 1 });

  Patient.findOne.mockResolvedValue({ _id: 'patient-ObjectId', patientId: 'P50001' });
});

describe('Prescriptions CRUD API Endpoints', () => {
  // Test 1
  it('should block unauthorized access', async () => {
    const res = await request(app).get('/api/prescriptions');
    expect(res.statusCode).toEqual(401);
  });

  // Test 2
  it('should get all prescriptions with pagination', async () => {
    const token = require('jsonwebtoken').sign(
      { id: adminUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/prescriptions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // Test 3
  it('should get prescription by ID', async () => {
    const token = require('jsonwebtoken').sign(
      { id: adminUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/prescriptions/PR50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.prescriptionId).toEqual('PR50001');
  });

  // Test 4
  it('should add a new prescription successfully when authorized', async () => {
    Prescription.create.mockResolvedValue(mockPrescription);

    const token = require('jsonwebtoken').sign(
      { id: adminUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'P50001',
        medicine: 'Paracetamol 500mg',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.prescriptionId).toEqual('PR50001');
  });

  // Test 5
  it('should reject prescription addition if patient not found', async () => {
    Patient.findOne.mockResolvedValue(null);

    const token = require('jsonwebtoken').sign(
      { id: adminUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'P99999',
        medicine: 'Paracetamol 500mg',
      });

    expect(res.statusCode).toEqual(404);
  });

  // Test 6
  it('should update prescription details successfully', async () => {
    const token = require('jsonwebtoken').sign(
      { id: adminUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .put('/api/prescriptions/PR50001')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicine: 'Ibuprofen 400mg' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  // Test 7
  it('should delete prescription when user is admin', async () => {
    const token = require('jsonwebtoken').sign(
      { id: adminUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .delete('/api/prescriptions/PR50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('deleted successfully');
  });

  // Test 8
  it('should block non-admin from deleting prescription', async () => {
    findByIdResult.select.mockResolvedValue(staffUser); // Mock findById to return staff user

    const token = require('jsonwebtoken').sign(
      { id: staffUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .delete('/api/prescriptions/PR50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(403); // Forbidden
  });
});
