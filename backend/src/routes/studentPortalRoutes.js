const express = require('express');
const router = express.Router();
const { protect, studentOnly } = require('../middlewares/authMiddleware');
const {
  getMyProfile, getMyCourses, getMyFees, getMyResults, getMyAttendance,
  getMyFines, getMyModules, getMyDateSheets, getMyTimetable, getMyReportCard
} = require('../controllers/studentPortalController');

router.use(protect, studentOnly);

router.get('/profile',      getMyProfile);
router.get('/courses',      getMyCourses);
router.get('/fees',         getMyFees);
router.get('/results',      getMyResults);
router.get('/attendance',   getMyAttendance);
router.get('/fines',        getMyFines);
router.get('/modules',      getMyModules);
router.get('/date-sheets',  getMyDateSheets);
router.get('/timetable',    getMyTimetable);
router.get('/report-card',  getMyReportCard);

module.exports = router;
