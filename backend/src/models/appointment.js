const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appointmentId: { type: String, required: true, unique: true }, // e.g. A001
  patientId: { type: String, required: true }, // Legacy ID string (e.g. P001)
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  doctorId: { type: String, required: true }, // Legacy ID string (e.g. D001)
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  date: { type: String, required: true }, // Format YYYY-MM-DD
  time: { type: String, required: true }, // Format HH:MM
  dateTime: { type: Date, required: true } // JS Date object for range queries & sorting
}, { timestamps: true });

// Indexes for performance
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ doctorId: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ dateTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
