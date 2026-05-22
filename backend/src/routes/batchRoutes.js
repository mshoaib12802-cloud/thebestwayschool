const express = require('express');
const router = express.Router();
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');
const {
  getBatches, createBatch, updateBatch, deleteBatch, toggleBatchActive, getBatchStudents,
  enrollStudent, unenrollStudent,
  getSchedules, addSchedule, deleteSchedule
} = require('../controllers/batchController');

router.get('/',                          protect, staffOnly, getBatches);
router.post('/',                         protect, staffOnly, createBatch);
router.get('/schedules',                 protect, staffOnly, getSchedules);
router.post('/schedules',                protect, staffOnly, addSchedule);
router.delete('/schedules/:id',          protect, staffOnly, deleteSchedule);
router.put('/:id/toggle-active',         protect, staffOnly, toggleBatchActive);
router.get('/:id/students',              protect, staffOnly, getBatchStudents);
router.post('/:id/enroll',               protect, staffOnly, enrollStudent);
router.delete('/:id/unenroll/:studentId',protect, staffOnly, unenrollStudent);
router.put('/:id',                       protect, staffOnly, updateBatch);
router.delete('/:id',                    protect, adminOnly, deleteBatch);

module.exports = router;
