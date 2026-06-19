const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .get(getDoctors)
  .post(authorize('admin', 'staff'), createDoctor);

router.route('/:id')
  .get(getDoctorById)
  .put(authorize('admin', 'staff'), updateDoctor)
  .delete(authorize('admin'), deleteDoctor);

module.exports = router;
