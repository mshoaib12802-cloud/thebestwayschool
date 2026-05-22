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
router.get('/timetable',           getTeacherTimetable);

module.exports = router;
