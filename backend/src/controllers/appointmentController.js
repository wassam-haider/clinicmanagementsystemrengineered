const Appointment = require('../models/appointment');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const { getNextId } = require('../utils/idGenerator');

// @desc    Get all appointments with pagination, filter & search
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortBy || 'dateTime';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    let query = {};

    // Filter by date range (YYYY-MM-DD)
    if (req.query.startDate && req.query.endDate) {
      query.dateTime = {
        $gte: new Date(`${req.query.startDate}T00:00:00`),
        $lte: new Date(`${req.query.endDate}T23:59:59`)
      };
    } else if (req.query.date) {
      query.date = req.query.date;
    }

    // Search by patientId or doctorId
    if (req.query.patientId) {
      query.patientId = req.query.patientId;
    }
    if (req.query.doctorId) {
      query.doctorId = req.query.doctorId;
    }

    // Advanced search: search patient/doctor name by using population or text search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      // Look up matching patients/doctors first to get their IDs
      const matchingPatients = await Patient.find({ name: searchRegex }).select('patientId');
      const patientIds = matchingPatients.map(p => p.patientId);

      const matchingDoctors = await Doctor.find({ name: searchRegex }).select('doctorId');
      const doctorIds = matchingDoctors.map(d => d.doctorId);

      query.$or = [
        { appointmentId: searchRegex },
        { patientId: { $in: patientIds } },
        { doctorId: { $in: doctorIds } }
      ];
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('patient')
      .populate('doctor')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: appointments.length,
      page,
      pages: Math.ceil(total / limit),
      total,
      data: appointments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
const getAppointmentById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('A') ? { appointmentId: id } : { _id: id };

    const appointment = await Appointment.findOne(query)
      .populate('patient')
      .populate('doctor');

    if (!appointment) {
      res.status(404);
      return next(new Error('Appointment not found'));
    }

    res.json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
};

// @desc    Book appointment
// @route   POST /api/appointments
// @access  Private (admin or staff)
const bookAppointment = async (req, res, next) => {
  try {
    const { patientId, doctorId, date, time } = req.body;

    // Validate patient
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      res.status(404);
      return next(new Error(`Patient with ID ${patientId} not found`));
    }

    // Validate doctor
    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      res.status(404);
      return next(new Error(`Doctor with ID ${doctorId} not found`));
    }

    const appointmentId = await getNextId('A', Appointment, 'appointmentId');
    const dateTime = new Date(`${date}T${time}:00`);

    const appointment = await Appointment.create({
      appointmentId,
      patientId,
      patient: patient._id,
      doctorId,
      doctor: doctor._id,
      date,
      time,
      dateTime
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private (admin or staff)
const updateAppointment = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('A') ? { appointmentId: id } : { _id: id };

    let appointment = await Appointment.findOne(query);

    if (!appointment) {
      res.status(404);
      return next(new Error('Appointment not found'));
    }

    const updateData = { ...req.body };

    // If date/time updated, recalculate dateTime
    if (updateData.date || updateData.time) {
      const d = updateData.date || appointment.date;
      const t = updateData.time || appointment.time;
      updateData.dateTime = new Date(`${d}T${t}:00`);
    }

    // If patientId updated, validate and link new ref
    if (updateData.patientId) {
      const patient = await Patient.findOne({ patientId: updateData.patientId });
      if (!patient) {
        res.status(404);
        return next(new Error(`Patient with ID ${updateData.patientId} not found`));
      }
      updateData.patient = patient._id;
    }

    // If doctorId updated, validate and link new ref
    if (updateData.doctorId) {
      const doctor = await Doctor.findOne({ doctorId: updateData.doctorId });
      if (!doctor) {
        res.status(404);
        return next(new Error(`Doctor with ID ${updateData.doctorId} not found`));
      }
      updateData.doctor = doctor._id;
    }

    appointment = await Appointment.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true
    }).populate('patient').populate('doctor');

    res.json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private (admin only)
const deleteAppointment = async (req, res, next) => {
  try {
    const id = req.params.id;
    const query = id.startsWith('A') ? { appointmentId: id } : { _id: id };

    const appointment = await Appointment.findOne(query);

    if (!appointment) {
      res.status(404);
      return next(new Error('Appointment not found'));
    }

    await Appointment.deleteOne(query);

    res.json({ success: true, message: `Appointment ${id} cancelled successfully` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAppointments,
  getAppointmentById,
  bookAppointment,
  updateAppointment,
  deleteAppointment
};
