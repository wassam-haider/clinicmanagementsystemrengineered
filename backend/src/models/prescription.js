const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, required: true, unique: true }, // e.g. PR001
  patientId: { type: String, required: true }, // Legacy ID string (e.g. P001)
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  medicine: { type: String, required: true, trim: true }
}, { timestamps: true });

// Indexes for performance
prescriptionSchema.index({ patientId: 1 });
prescriptionSchema.index({ medicine: 'text' });

module.exports = mongoose.model('Prescription', prescriptionSchema);
