const express = require('express');
const router = express.Router();
const { protect, studentOnly } = require('../middlewares/authMiddleware');
const {
  getMyProfile, getMyCourses, getMyFees, getMyResults, getMyAttendance,
  getMyFines, getMyModules, getMyDateSheets, getMyTimetable, getMyReportCard, getMySchoolReportCards
} = require('../controllers/studentPortalController');
const { getStudentSchoolTimetable } = require('../controllers/classTimetableController');
const { getStudentInvoices } = require('../controllers/feeStructureController');
const { getMyAssignments, submitAssignment, getMySubmission } = require('../controllers/assignmentController');
const { getMyLeaves } = require('../controllers/leaveController');
const { getStudentAnnouncements } = require('../controllers/announcementController');
const { getMyBooks } = require('../controllers/libraryController');

router.use(protect, studentOnly);

router.get('/profile',      getMyProfile);
router.get('/courses',      getMyCourses);
router.get('/fees',         getMyFees);
router.get('/results',      getMyResults);
router.get('/attendance',   getMyAttendance);
router.get('/fines',        getMyFines);
router.get('/modules',      getMyModules);
router.get('/date-sheets',  getMyDateSheets);
router.get('/timetable',         getMyTimetable);
router.get('/school-timetable',    getStudentSchoolTimetable);
router.get('/report-card',          getMyReportCard);
router.get('/school-report-cards',  getMySchoolReportCards);
router.get('/fee-invoices',        getStudentInvoices);
router.get('/assignments',         getMyAssignments);
router.post('/assignments/:id/submit', submitAssignment);
router.get('/assignments/:id/my-submission', getMySubmission);
router.get('/leaves',              getMyLeaves);
router.get('/announcements',       getStudentAnnouncements);
router.get('/library/my-books',    getMyBooks);
router.get('/diary',               require('../controllers/diaryController').getStudentDiary);
router.get('/canteen',             require('../controllers/canteenController').getMyCanteen);

module.exports = router;
