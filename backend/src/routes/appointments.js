const express = require('express');
const router = express.Router();
const {
  getAppointments,
  getAppointmentById,
  bookAppointment,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .get(getAppointments)
  .post(authorize('admin', 'staff'), bookAppointment);

router.route('/:id')
  .get(getAppointmentById)
  .put(authorize('admin', 'staff'), updateAppointment)
  .delete(authorize('admin'), deleteAppointment);

module.exports = router;
