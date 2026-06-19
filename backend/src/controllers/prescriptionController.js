const Prescription = require('../models/prescription');
const Patient = require('../models/patient');
const { getNextId } = require('../utils/idGenerator');

// @desc    Get all prescriptions with pagination & search
// @route   GET /api/prescriptions
// @access  Private
const getPrescriptions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    let query = {};

    if (req.query.patientId) {
      query.patientId = req.query.patientId;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      const matchingPatients = await Patient.find({ name: searchRegex }).select('patientId');
      const patientIds = matchingPatients.map(p => p.patientId);

      query.$or = [
        { prescriptionId: searchRegex },
        { medicine: searchRegex },
        { patientId: { $in: patientIds } }
      ];
    }

    const total = await Prescription.countDocuments(query);
    const prescriptions = await Prescription.find(query)
      .populate('patient')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: prescriptions.length,
      page,
      pages: Math.ceil(total / limit),
      total,
      data: prescriptions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
// @access  Private
const getPrescriptionById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('PR') ? { prescriptionId: id } : { _id: id };

    const prescription = await Prescription.findOne(query).populate('patient');

    if (!prescription) {
      res.status(404);
      return next(new Error('Prescription not found'));
    }

    res.json({ success: true, data: prescription });
  } catch (err) {
    next(err);
  }
};

// @desc    Add prescription
// @route   POST /api/prescriptions
// @access  Private (admin or staff)
const addPrescription = async (req, res, next) => {
  try {
    const { patientId, medicine } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      res.status(404);
      return next(new Error(`Patient with ID ${patientId} not found`));
    }

    const prescriptionId = await getNextId('PR', Prescription, 'prescriptionId');

    const prescription = await Prescription.create({
      prescriptionId,
      patientId,
      patient: patient._id,
      medicine
    });

    res.status(201).json({ success: true, data: prescription });
  } catch (err) {
    next(err);
  }
};

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
// @access  Private (admin or staff)
const updatePrescription = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('PR') ? { prescriptionId: id } : { _id: id };

    let prescription = await Prescription.findOne(query);

    if (!prescription) {
      res.status(404);
      return next(new Error('Prescription not found'));
    }

    const updateData = { ...req.body };

    if (updateData.patientId) {
      const patient = await Patient.findOne({ patientId: updateData.patientId });
      if (!patient) {
        res.status(404);
        return next(new Error(`Patient with ID ${updateData.patientId} not found`));
      }
      updateData.patient = patient._id;
    }

    prescription = await Prescription.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true
    }).populate('patient');

    res.json({ success: true, data: prescription });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (admin only)
const deletePrescription = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('PR') ? { prescriptionId: id } : { _id: id };

    const prescription = await Prescription.findOne(query);

    if (!prescription) {
      res.status(404);
      return next(new Error('Prescription not found'));
    }

    await Prescription.deleteOne(query);

    res.json({ success: true, message: `Prescription ${id} deleted successfully` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPrescriptions,
  getPrescriptionById,
  addPrescription,
  updatePrescription,
  deletePrescription
};
