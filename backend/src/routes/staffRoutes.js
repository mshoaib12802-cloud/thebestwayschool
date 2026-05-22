const express = require('express');
const router = express.Router();
const { addStaff, getAllStaff, deleteStaff, getTrainers, resetStaffCredentials, updateStaffCourses } = require('../controllers/staffController');
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');

router.post('/add',              protect, adminOnly, addStaff);
router.get('/',                  protect, staffOnly, getAllStaff);
router.get('/trainers',          protect, staffOnly, getTrainers);
router.delete('/:id',            protect, adminOnly, deleteStaff);
router.post('/:id/reset-credentials', protect, adminOnly, resetStaffCredentials);
router.put('/:id/courses',       protect, adminOnly, updateStaffCourses);

module.exports = router;
