const express = require('express');
const router = express.Router();
const {
  getPrescriptions,
  getPrescriptionById,
  addPrescription,
  updatePrescription,
  deletePrescription
} = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .get(getPrescriptions)
  .post(authorize('admin', 'staff'), addPrescription);

router.route('/:id')
  .get(getPrescriptionById)
  .put(authorize('admin', 'staff'), updatePrescription)
  .delete(authorize('admin'), deletePrescription);

module.exports = router;
