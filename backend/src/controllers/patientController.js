const Patient = require('../models/patient');
const { getNextId } = require('../utils/idGenerator');

// @desc    Get all patients with pagination, search & sort
// @route   GET /api/patients
// @access  Private
const getPatients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    // Build query
    let query = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { patientId: searchRegex },
          { phone: searchRegex }
        ]
      };
    }

    if (req.query.gender) {
      query.gender = req.query.gender;
    }

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: patients.length,
      page,
      pages: Math.ceil(total / limit),
      total,
      data: patients
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single patient by ID (internal patientId or _id)
// @route   GET /api/patients/:id
// @access  Private
const getPatientById = async (req, res, next) => {
  try {
    const id = req.params.id;
    // Check if it's a legacy ID (e.g. P00001) or MongoDB ObjectId
    const query = id.startsWith('P') ? { patientId: id } : { _id: id };
    
    const patient = await Patient.findOne(query);

    if (!patient) {
      res.status(404);
      return next(new Error('Patient not found'));
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private (admin or staff)
const createPatient = async (req, res, next) => {
  try {
    const { name, age, gender, phone } = req.body;

    // Generate sequential patientId (e.g. P50002)
    const patientId = await getNextId('P', Patient, 'patientId');

    const patient = await Patient.create({
      patientId,
      name,
      age,
      gender,
      phone
    });

    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private (admin or staff)
const updatePatient = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('P') ? { patientId: id } : { _id: id };

    let patient = await Patient.findOne(query);

    if (!patient) {
      res.status(404);
      return next(new Error('Patient not found'));
    }

    patient = await Patient.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private (admin only)
const deletePatient = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('P') ? { patientId: id } : { _id: id };

    const patient = await Patient.findOne(query);

    if (!patient) {
      res.status(404);
      return next(new Error('Patient not found'));
    }

    await Patient.deleteOne(query);

    res.json({ success: true, message: `Patient with ID ${id} deleted successfully` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
};
