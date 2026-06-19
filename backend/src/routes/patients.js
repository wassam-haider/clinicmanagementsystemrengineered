const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
} = require('../controllers/patientController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .get(getPatients)
  .post(authorize('admin', 'staff'), createPatient);

router.route('/:id')
  .get(getPatientById)
  .put(authorize('admin', 'staff'), updatePatient)
  .delete(authorize('admin'), deletePatient);

module.exports = router;
