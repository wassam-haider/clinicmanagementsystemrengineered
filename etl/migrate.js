const path = require('path');
// Load environment variables from backend .env
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Use the exact same mongoose instance from backend node_modules to avoid duplicate instances
const mongoose = require('../backend/node_modules/mongoose');

const { extractRecords } = require('./extract');
const {
  transformPatient,
  transformDoctor,
  transformAppointment,
  transformPrescription
} = require('./transform');
const { bulkInsertWithRetry } = require('./load');

// Import Mongoose Models (compiled on backend/node_modules/mongoose)
const Patient = require('../backend/src/models/patient');
const Doctor = require('../backend/src/models/doctor');
const Appointment = require('../backend/src/models/appointment');
const Prescription = require('../backend/src/models/prescription');
const User = require('../backend/src/models/user');

const MONGO_URI = process.env.MONGODB_URI
  || process.env.MONGO_URI
  || 'mongodb+srv://sp23bsse0013:1234@cluster0.dywahw1.mongodb.net/clinic_management?retryWrites=true&w=majority&appName=Cluster0';

// Paths to legacy files
const LEGACY_DIR = path.join(__dirname, '../../'); // parent directory containing txt files
const PATIENTS_FILE = path.join(LEGACY_DIR, 'patients.txt');
const DOCTORS_FILE = path.join(LEGACY_DIR, 'doctors.txt');
const APPOINTMENTS_FILE = path.join(LEGACY_DIR, 'appointments.txt');
const PRESCRIPTIONS_FILE = path.join(LEGACY_DIR, 'prescriptions.txt');

const BATCH_SIZE = 5000;

async function runMigration() {
  console.log('--- Starting Clinic Management Re-engineered ETL Pipeline ---');
  console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
  
  await mongoose.connect(MONGO_URI);
  console.log('[SUCCESS] Connected to MongoDB');

  // Clear existing collections before migration to start fresh and avoid duplicates
  console.log('Clearing existing data from MongoDB...');
  await Promise.all([
    Patient.deleteMany({}),
    Doctor.deleteMany({}),
    Appointment.deleteMany({}),
    Prescription.deleteMany({})
  ]);
  console.log('[SUCCESS] Cleared existing collection records');

  // Ensure the users collection exists. The supplied TXT files do not contain user data.
  await User.createCollection();
  if (process.env.SEED_ADMIN_USER === 'true') {
    await User.deleteOne({ email: process.env.ADMIN_EMAIL || 'admin@clinic.com' });
    await User.create({
      name: process.env.ADMIN_NAME || 'Clinic Admin',
      email: process.env.ADMIN_EMAIL || 'admin@clinic.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });
    console.log('[SUCCESS] Seeded admin user');
  }

  // 1. Migrate Patients
  console.log('\n[Phase 1] Migrating Patients...');
  const patientStartTime = Date.now();
  let patientBatch = [];
  let patientCount = 0;

  const patientGenerator = extractRecords(PATIENTS_FILE, ['patientId', 'name', 'age', 'gender', 'phone']);
  for await (const rawPatient of patientGenerator) {
    const cleanPatient = transformPatient(rawPatient);
    if (cleanPatient) {
      patientBatch.push(cleanPatient);
      patientCount++;
    }

    if (patientBatch.length >= BATCH_SIZE) {
      await bulkInsertWithRetry(Patient, patientBatch);
      patientBatch = [];
      process.stdout.write(`Processed ${patientCount} patients...\r`);
    }
  }
  if (patientBatch.length > 0) {
    await bulkInsertWithRetry(Patient, patientBatch);
  }
  console.log(`[SUCCESS] Migrated ${patientCount} patients in ${((Date.now() - patientStartTime) / 1000).toFixed(2)}s`);

  // Build Patient cache for fast references resolver
  console.log('Building Patient Cache in Memory...');
  const patientCache = new Map();
  const dbPatients = await Patient.find({}, { patientId: 1, _id: 1 }).lean();
  dbPatients.forEach(p => {
    patientCache.set(p.patientId, p._id);
  });
  console.log(`Cache built with ${patientCache.size} patients.`);

  // 2. Migrate Doctors
  console.log('\n[Phase 2] Migrating Doctors...');
  const doctorStartTime = Date.now();
  let doctorBatch = [];
  let doctorCount = 0;

  const doctorGenerator = extractRecords(DOCTORS_FILE, ['doctorId', 'name', 'specialization']);
  for await (const rawDoctor of doctorGenerator) {
    const cleanDoctor = transformDoctor(rawDoctor);
    if (cleanDoctor) {
      doctorBatch.push(cleanDoctor);
      doctorCount++;
    }

    if (doctorBatch.length >= BATCH_SIZE) {
      await bulkInsertWithRetry(Doctor, doctorBatch);
      doctorBatch = [];
      process.stdout.write(`Processed ${doctorCount} doctors...\r`);
    }
  }
  if (doctorBatch.length > 0) {
    await bulkInsertWithRetry(Doctor, doctorBatch);
  }
  console.log(`[SUCCESS] Migrated ${doctorCount} doctors in ${((Date.now() - doctorStartTime) / 1000).toFixed(2)}s`);

  // Build Doctor cache
  console.log('Building Doctor Cache in Memory...');
  const doctorCache = new Map();
  const dbDoctors = await Doctor.find({}, { doctorId: 1, _id: 1 }).lean();
  dbDoctors.forEach(d => {
    doctorCache.set(d.doctorId, d._id);
  });
  console.log(`Cache built with ${doctorCache.size} doctors.`);

  // 3. Migrate Appointments
  console.log('\n[Phase 3] Migrating Appointments...');
  const appointmentStartTime = Date.now();
  let appointmentBatch = [];
  let appointmentCount = 0;
  let unlinkedAppointments = 0;

  const appointmentGenerator = extractRecords(APPOINTMENTS_FILE, ['appointmentId', 'patientId', 'doctorId', 'date', 'time']);
  for await (const rawAppointment of appointmentGenerator) {
    const cleanApp = transformAppointment(rawAppointment);
    if (cleanApp) {
      // Resolve patient and doctor ObjectIds
      const patientOid = patientCache.get(cleanApp.patientId);
      const doctorOid = doctorCache.get(cleanApp.doctorId);

      if (patientOid && doctorOid) {
        cleanApp.patient = patientOid;
        cleanApp.doctor = doctorOid;
        appointmentBatch.push(cleanApp);
        appointmentCount++;
      } else {
        unlinkedAppointments++;
      }
    }

    if (appointmentBatch.length >= BATCH_SIZE) {
      await bulkInsertWithRetry(Appointment, appointmentBatch);
      appointmentBatch = [];
      process.stdout.write(`Processed ${appointmentCount} appointments...\r`);
    }
  }
  if (appointmentBatch.length > 0) {
    await bulkInsertWithRetry(Appointment, appointmentBatch);
  }
  console.log(`[SUCCESS] Migrated ${appointmentCount} appointments in ${((Date.now() - appointmentStartTime) / 1000).toFixed(2)}s`);
  if (unlinkedAppointments > 0) {
    console.warn(`[WARNING] Skipped ${unlinkedAppointments} appointments due to missing Patient or Doctor mapping.`);
  }

  // 4. Migrate Prescriptions
  console.log('\n[Phase 4] Migrating Prescriptions...');
  const rxStartTime = Date.now();
  let rxBatch = [];
  let rxCount = 0;
  let unlinkedRx = 0;

  const rxGenerator = extractRecords(PRESCRIPTIONS_FILE, ['prescriptionId', 'patientId', 'medicine']);
  for await (const rawRx of rxGenerator) {
    const cleanRx = transformPrescription(rawRx);
    if (cleanRx) {
      const patientOid = patientCache.get(cleanRx.patientId);
      if (patientOid) {
        cleanRx.patient = patientOid;
        rxBatch.push(cleanRx);
        rxCount++;
      } else {
        unlinkedRx++;
      }
    }

    if (rxBatch.length >= BATCH_SIZE) {
      await bulkInsertWithRetry(Prescription, rxBatch);
      rxBatch = [];
      process.stdout.write(`Processed ${rxCount} prescriptions...\r`);
    }
  }
  if (rxBatch.length > 0) {
    await bulkInsertWithRetry(Prescription, rxBatch);
  }
  console.log(`[SUCCESS] Migrated ${rxCount} prescriptions in ${((Date.now() - rxStartTime) / 1000).toFixed(2)}s`);
  if (unlinkedRx > 0) {
    console.warn(`[WARNING] Skipped ${unlinkedRx} prescriptions due to missing Patient mapping.`);
  }

  console.log('\n--- ETL Pipeline Complete ---');
  console.log(`Total Records Migrated: ${patientCount + doctorCount + appointmentCount + rxCount}`);
  
  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('Migration failed critically:', err);
  process.exit(1);
});
