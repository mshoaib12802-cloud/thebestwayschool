const express = require('express');
const router = express.Router();
const {
  getChildren, getChildAttendance, getChildReportCards,
  getChildFees, getChildFines, getParentProfile, getChildrenHomework,
} = require('../controllers/parentPortalController');
const { getChildSchoolTimetable } = require('../controllers/classTimetableController');
const { getChildInvoices } = require('../controllers/feeStructureController');
const { getChildAssignments } = require('../controllers/assignmentController');
const { applyStudentLeave, getChildLeaves } = require('../controllers/leaveController');
const { getParentAnnouncements } = require('../controllers/announcementController');
const { getStudentConduct } = require('../controllers/conductController');
const { getMyTransport } = require('../controllers/transportController');
const { getParentPTMs, bookSlot } = require('../controllers/ptmController');
const { protect, parentOnly } = require('../middlewares/authMiddleware');

router.get('/children',                            protect, parentOnly, getChildren);
router.get('/children/:studentId/attendance',      protect, parentOnly, getChildAttendance);
router.get('/children/:studentId/report-cards',    protect, parentOnly, getChildReportCards);
router.get('/children/:studentId/fees',            protect, parentOnly, getChildFees);
router.get('/children/:studentId/fines',           protect, parentOnly, getChildFines);
router.get('/children/:studentId/timetable',       protect, parentOnly, getChildSchoolTimetable);
router.get('/children/:studentId/fee-invoices',    protect, parentOnly, getChildInvoices);
router.get('/children/:studentId/assignments',     protect, parentOnly, getChildAssignments);
router.get('/children/:studentId/leaves',          protect, parentOnly, getChildLeaves);
router.post('/children/:studentId/leaves',         protect, parentOnly, applyStudentLeave);
router.get('/children/:studentId/conduct',         protect, parentOnly, getStudentConduct);
router.get('/children/:studentId/transport',       protect, parentOnly, getMyTransport);
router.get('/children/:studentId/ptm',             protect, parentOnly, getParentPTMs);
router.post('/ptm/book-slot',                      protect, parentOnly, bookSlot);
router.get('/announcements',                       protect, parentOnly, getParentAnnouncements);
router.get('/homework',                            protect, parentOnly, getChildrenHomework);
router.get('/children/:studentId/diary',           protect, parentOnly, require('../controllers/diaryController').getChildDiary);
router.get('/children/:studentId/canteen',         protect, parentOnly, require('../controllers/canteenController').getChildCanteen);
router.get('/profile',                             protect, parentOnly, getParentProfile);

module.exports = router;
