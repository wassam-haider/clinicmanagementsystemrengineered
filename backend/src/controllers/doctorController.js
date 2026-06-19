const Doctor = require('../models/doctor');
const { getNextId } = require('../utils/idGenerator');

// @desc    Get all doctors with pagination & search
// @route   GET /api/doctors
// @access  Private
const getDoctors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    let query = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { doctorId: searchRegex },
          { specialization: searchRegex }
        ]
      };
    }

    if (req.query.specialization) {
      query.specialization = req.query.specialization;
    }

    const total = await Doctor.countDocuments(query);
    const doctors = await Doctor.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: doctors.length,
      page,
      pages: Math.ceil(total / limit),
      total,
      data: doctors
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single doctor by ID
// @route   GET /api/doctors/:id
// @access  Private
const getDoctorById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('D') ? { doctorId: id } : { _id: id };

    const doctor = await Doctor.findOne(query);

    if (!doctor) {
      res.status(404);
      return next(new Error('Doctor not found'));
    }

    res.json({ success: true, data: doctor });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new doctor
// @route   POST /api/doctors
// @access  Private (admin or staff)
const createDoctor = async (req, res, next) => {
  try {
    const { name, specialization } = req.body;

    const doctorId = await getNextId('D', Doctor, 'doctorId');

    const doctor = await Doctor.create({
      doctorId,
      name,
      specialization
    });

    res.status(201).json({ success: true, data: doctor });
  } catch (err) {
    next(err);
  }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
// @access  Private (admin or staff)
const updateDoctor = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('D') ? { doctorId: id } : { _id: id };

    let doctor = await Doctor.findOne(query);

    if (!doctor) {
      res.status(404);
      return next(new Error('Doctor not found'));
    }

    doctor = await Doctor.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, data: doctor });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete doctor
// @route   DELETE /api/doctors/:id
// @access  Private (admin only)
const deleteDoctor = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('D') ? { doctorId: id } : { _id: id };

    const doctor = await Doctor.findOne(query);

    if (!doctor) {
      res.status(404);
      return next(new Error('Doctor not found'));
    }

    await Doctor.deleteOne(query);

    res.json({ success: true, message: `Doctor with ID ${id} deleted successfully` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
};
