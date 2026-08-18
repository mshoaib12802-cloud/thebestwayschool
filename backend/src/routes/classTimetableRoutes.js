const express = require('express');
const router = express.Router();
const {
  getClassTimetable, setTimetableEntry, clearTimetableEntry,
  getTeacherSchoolTimetable, getStudentSchoolTimetable, getChildSchoolTimetable,
} = require('../controllers/classTimetableController');
const { protect, staffOnly, staffOrTeacher, teacherOnly, studentOnly, parentOnly } = require('../middlewares/authMiddleware');

router.get('/',                                    protect, staffOrTeacher,  getClassTimetable);
router.put('/entry',                               protect, staffOnly,       setTimetableEntry);
router.delete('/entry',                            protect, staffOnly,       clearTimetableEntry);
router.get('/teacher',                             protect, teacherOnly,     getTeacherSchoolTimetable);
router.get('/student',                             protect, studentOnly,     getStudentSchoolTimetable);
router.get('/child/:studentId',                    protect, parentOnly,      getChildSchoolTimetable);

module.exports = router;
