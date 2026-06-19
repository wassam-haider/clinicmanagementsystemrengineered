const request = require('supertest');

jest.mock('../src/models/user', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/appointment', () => ({
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

jest.mock('../src/models/doctor', () => ({
  findOne: jest.fn(),
}));

const app = require('../src/app');
const User = require('../src/models/user');
const Appointment = require('../src/models/appointment');
const Patient = require('../src/models/patient');
const Doctor = require('../src/models/doctor');

const authUser = {
  _id: 'user-1',
  id: 'user-1',
  name: 'Appointment Admin',
  email: 'appointmentadmin@example.com',
  role: 'admin',
};

const findByIdResult = {
  select: jest.fn().mockResolvedValue(authUser),
};

const mockAppointment = {
  _id: 'appointment-ObjectId',
  appointmentId: 'A50001',
  patientId: 'P50001',
  doctorId: 'D50001',
  date: '2026-06-20',
  time: '10:00',
  dateTime: new Date('2026-06-20T10:00:00'),
};

const mockFindQuery = {
  populate: jest.fn().mockImplementation(() => mockFindQuery),
  sort: jest.fn().mockImplementation(() => mockFindQuery),
  skip: jest.fn().mockImplementation(() => mockFindQuery),
  limit: jest.fn().mockImplementation(() => mockFindQuery),
  then: jest.fn().mockImplementation((onResolve) => Promise.resolve([mockAppointment]).then(onResolve)),
};

const mockFindOneQuery = {
  populate: jest.fn().mockImplementation(() => mockFindOneQuery),
  then: jest.fn().mockImplementation((onResolve) => Promise.resolve(mockAppointment).then(onResolve)),
};

beforeEach(() => {
  jest.clearAllMocks();
  findByIdResult.select.mockResolvedValue(authUser);
  User.findById.mockReturnValue(findByIdResult);
  Appointment.aggregate.mockReturnValue({
    exec: jest.fn().mockResolvedValue([{ numericPart: 50000 }]),
  });
  Appointment.countDocuments.mockResolvedValue(1);
  Appointment.find.mockReturnValue(mockFindQuery);
  Appointment.findOne.mockReturnValue(mockFindOneQuery);
  Appointment.findOneAndUpdate.mockReturnValue(mockFindOneQuery);
  Appointment.deleteOne.mockResolvedValue({ deletedCount: 1 });

  Patient.findOne.mockResolvedValue({ _id: 'patient-ObjectId', patientId: 'P50001' });
  Doctor.findOne.mockResolvedValue({ _id: 'doctor-ObjectId', doctorId: 'D50001' });
});

describe('Appointments CRUD API Endpoints', () => {
  // Test 1
  it('should block unauthorized access', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.statusCode).toEqual(401);
  });

  // Test 2
  it('should book a new appointment successfully when authorized', async () => {
    Appointment.create.mockResolvedValue(mockAppointment);

    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'P50001',
        doctorId: 'D50001',
        date: '2026-06-20',
        time: '10:00',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appointmentId).toEqual('A50001');
  });

  // Test 3
  it('should reject booking if patient is not found', async () => {
    Patient.findOne.mockResolvedValue(null);

    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'P99999',
        doctorId: 'D50001',
        date: '2026-06-20',
        time: '10:00',
      });

    expect(res.statusCode).toEqual(404);
    expect(res.body.message).toContain('Patient with ID P99999 not found');
  });

  // Test 4
  it('should reject booking if doctor is not found', async () => {
    Doctor.findOne.mockResolvedValue(null);

    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'P50001',
        doctorId: 'D99999',
        date: '2026-06-20',
        time: '10:00',
      });

    expect(res.statusCode).toEqual(404);
    expect(res.body.message).toContain('Doctor with ID D99999 not found');
  });

  // Test 5
  it('should get all appointments with pagination', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/appointments?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // Test 6
  it('should get appointment by ID', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .get('/api/appointments/A50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.appointmentId).toEqual('A50001');
  });

  // Test 7
  it('should update appointment details successfully', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .put('/api/appointments/A50001')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-06-21', time: '11:00' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  // Test 8
  it('should delete appointment when user is admin', async () => {
    const token = require('jsonwebtoken').sign(
      { id: authUser.id },
      process.env.JWT_SECRET || 'YourSuperSecretKey'
    );

    const res = await request(app)
      .delete('/api/appointments/A50001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('cancelled successfully');
  });
});
