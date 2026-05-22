const express = require('express');
const router = express.Router();
const {
  markAttendance, getDailyStatus, markLeave,
  getMonthlyReport, getStaffMonthlyReport, markAllPresent
} = require('../controllers/attendanceController');
const { protect, staffOnly } = require('../middlewares/authMiddleware');

router.post('/mark',         protect, staffOnly, markAttendance);
router.get('/status',        protect, staffOnly, getDailyStatus);
router.get('/report',        protect, staffOnly, getMonthlyReport);
router.post('/leave',        protect, staffOnly, markLeave);
router.get('/staff-report',  protect, staffOnly, getStaffMonthlyReport);
router.post('/mark-all',     protect, staffOnly, markAllPresent);

module.exports = router;
