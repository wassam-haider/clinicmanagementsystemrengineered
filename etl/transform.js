const fs = require('fs');
const path = require('path');

const errorLogPath = path.join(__dirname, 'migration_errors.log');
// Clear existing log file
if (fs.existsSync(errorLogPath)) {
  fs.writeFileSync(errorLogPath, '');
}

function logError(recordType, recordId, errorMsg, originalLine) {
  const logMsg = `[${new Date().toISOString()}] [${recordType}] ID: ${recordId} - Error: ${errorMsg} - Original Data: ${JSON.stringify(originalLine)}\n`;
  fs.appendFileSync(errorLogPath, logMsg);
}

function transformPatient(patient) {
  try {
    if (!patient.patientId || !patient.name) {
      throw new Error('Missing patientId or name');
    }

    const age = parseInt(patient.age, 10);
    if (isNaN(age) || age < 0) {
      throw new Error(`Invalid age: ${patient.age}`);
    }

    let gender = 'Other';
    const gTrim = (patient.gender || '').toLowerCase().trim();
    if (gTrim === 'male' || gTrim === 'm') {
      gender = 'Male';
    } else if (gTrim === 'female' || gTrim === 'f') {
      gender = 'Female';
    }

    // Basic phone clean: remove non-digits
    const phone = (patient.phone || '').replace(/\D/g, '');
    if (phone.length < 10 || phone.length > 15) {
      throw new Error(`Invalid phone length (${phone.length}): ${patient.phone}`);
    }

    return {
      patientId: patient.patientId,
      name: patient.name,
      age,
      gender,
      phone
    };
  } catch (err) {
    logError('Patient', patient.patientId || 'UNKNOWN', err.message, patient);
    return null;
  }
}

function transformDoctor(doctor) {
  try {
    if (!doctor.doctorId || !doctor.name || !doctor.specialization) {
      throw new Error('Missing doctorId, name or specialization');
    }

    return {
      doctorId: doctor.doctorId,
      name: doctor.name,
      specialization: doctor.specialization
    };
  } catch (err) {
    logError('Doctor', doctor.doctorId || 'UNKNOWN', err.message, doctor);
    return null;
  }
}

function transformAppointment(appointment) {
  try {
    if (!appointment.appointmentId || !appointment.patientId || !appointment.doctorId || !appointment.date || !appointment.time) {
      throw new Error('Missing appointment fields');
    }

    // Verify date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointment.date)) {
      throw new Error(`Invalid date format: ${appointment.date}`);
    }

    // Verify time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(appointment.time)) {
      throw new Error(`Invalid time format: ${appointment.time}`);
    }

    // Parse to JS Date object
    const dateTime = new Date(`${appointment.date}T${appointment.time}:00`);
    if (isNaN(dateTime.getTime())) {
      throw new Error(`Could not parse Date/Time: ${appointment.date} ${appointment.time}`);
    }

    return {
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      date: appointment.date,
      time: appointment.time,
      dateTime
    };
  } catch (err) {
    logError('Appointment', appointment.appointmentId || 'UNKNOWN', err.message, appointment);
    return null;
  }
}

function transformPrescription(prescription) {
  try {
    if (!prescription.prescriptionId || !prescription.patientId || !prescription.medicine) {
      throw new Error('Missing prescription fields');
    }

    return {
      prescriptionId: prescription.prescriptionId,
      patientId: prescription.patientId,
      medicine: prescription.medicine
    };
  } catch (err) {
    logError('Prescription', prescription.prescriptionId || 'UNKNOWN', err.message, prescription);
    return null;
  }
}

module.exports = {
  transformPatient,
  transformDoctor,
  transformAppointment,
  transformPrescription
};
