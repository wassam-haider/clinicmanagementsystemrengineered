const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  doctorId: { type: String, required: true, unique: true }, // e.g. D001
  name: { type: String, required: true, trim: true },
  specialization: { type: String, required: true, trim: true }
}, { timestamps: true });

// Indexes for fast lookup
doctorSchema.index({ name: 'text' });

module.exports = mongoose.model('Doctor', doctorSchema);
