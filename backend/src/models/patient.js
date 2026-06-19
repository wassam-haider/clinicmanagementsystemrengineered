// backend/src/models/patient.js

const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true }, // e.g., P001
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 0 },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  phone: {
    type: String,
    required: true,
    match: [/^\d{10,15}$/, 'Phone number must contain 10-15 digits']
  }
}, { timestamps: true });

// Indexes for fast lookup
patientSchema.index({ name: 'text' });

module.exports = mongoose.model('Patient', patientSchema);
