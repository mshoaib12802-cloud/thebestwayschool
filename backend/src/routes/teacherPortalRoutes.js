const express = require('express');
const router = express.Router();
const { protect, teacherOnly } = require('../middlewares/authMiddleware');
const {
  getTeacherProfile,
  getTeacherDashboard, getTeacherCourses, getTeacherStudents,
  getTeacherAttendance, markTeacherAttendance,
  getTeacherExams, createTeacherExam, getTeacherExamResults, saveTeacherResult, deleteTeacherExam,
  getTeacherTimetable,
} = require('../controllers/teacherPortalController');
const { getTeacherSchoolTimetable } = require('../controllers/classTimetableController');
const { getAssignments, createAssignment, updateAssignment, getSubmissions, gradeSubmission } = require('../controllers/assignmentController');
const { getMarksEntries, getMarksEntry, createOrUpdateMarksEntry, saveMarks } = require('../controllers/marksEntryController');
const { applyLeave, getMyLeaves } = require('../controllers/leaveController');
const { getTeacherAnnouncements, createAnnouncement } = require('../controllers/announcementController');
const { getPTMs, createPTM } = require('../controllers/ptmController');
const { getMyPayrolls } = require('../controllers/payrollController');

router.use(protect, teacherOnly);

router.get('/profile',             getTeacherProfile);
router.get('/dashboard',           getTeacherDashboard);
router.get('/courses',             getTeacherCourses);
router.get('/students',            getTeacherStudents);
router.get('/attendance',          getTeacherAttendance);
router.post('/attendance',         markTeacherAttendance);
router.get('/exams',               getTeacherExams);
router.post('/exams',              createTeacherExam);
router.get('/exams/:id/results',   getTeacherExamResults);
router.post('/exams/results',      saveTeacherResult);
router.delete('/exams/:id',        deleteTeacherExam);
router.get('/timetable',            getTeacherTimetable);
router.get('/school-timetable',    getTeacherSchoolTimetable);
router.get('/assignments',         getAssignments);
router.post('/assignments',        createAssignment);
router.put('/assignments/:id',     updateAssignment);
router.get('/assignments/:id/submissions', getSubmissions);
router.put('/assignments/:id/submissions/:submissionId', gradeSubmission);
router.get('/marks-entry',         getMarksEntries);
router.post('/marks-entry',        createOrUpdateMarksEntry);
router.get('/marks-entry/:id',     getMarksEntry);
router.put('/marks-entry/:id',     saveMarks);
router.post('/leave/apply',        applyLeave);
router.get('/leave/my',            getMyLeaves);
router.get('/announcements',       getTeacherAnnouncements);
router.post('/announcements',      createAnnouncement);
router.get('/ptm',                 getPTMs);
router.post('/ptm',                createPTM);
router.get('/payroll/my',          getMyPayrolls);

const { getDiaryEntries, createDiaryEntry, updateDiaryEntry } = require('../controllers/diaryController');
router.get('/diary',     getDiaryEntries);
router.post('/diary',    createDiaryEntry);
router.patch('/diary/:id', updateDiaryEntry);

module.exports = router;
