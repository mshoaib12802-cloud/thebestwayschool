const express = require('express');
const router  = express.Router();
const { protect, teacherOnly, studentOnly } = require('../middlewares/authMiddleware');
const {
  getMySubjects, getSubjectLessons,
  markLessonWatched, submitLessonQuiz, saveLessonNotes,
  getLessonDiscussions, postLessonDiscussion, deleteLessonDiscussion,
  getTeacherSubjects, getTeacherSubjectLessons,
  createLesson, updateLesson, deleteLesson, togglePublish,
  getSubjectStudentProgress,
  uploadLessonPdf, deleteLessonPdf,
} = require('../controllers/schoolLmsController');
const uploadPdf = require('../middlewares/uploadPdf');

router.use(protect);

// Student
router.get('/my-subjects',                          studentOnly, getMySubjects);
router.get('/subject/:subjectId/lessons',           studentOnly, getSubjectLessons);
router.post('/lesson/:lessonId/watched',            studentOnly, markLessonWatched);
router.post('/lesson/:lessonId/quiz',               studentOnly, submitLessonQuiz);
router.put('/lesson/:lessonId/notes',               studentOnly, saveLessonNotes);

// Discussions — any authenticated user (student asks, teacher replies)
router.get('/lesson/:lessonId/discussions',         getLessonDiscussions);
router.post('/lesson/:lessonId/discussions',        postLessonDiscussion);
router.delete('/discussion/:discId',                deleteLessonDiscussion);

// Teacher
router.get('/teacher/subjects',                     teacherOnly, getTeacherSubjects);
router.get('/teacher/subject/:subjectId/lessons',   teacherOnly, getTeacherSubjectLessons);
router.post('/teacher/subject/:subjectId/lessons',  teacherOnly, createLesson);
router.put('/teacher/lesson/:lessonId',             teacherOnly, updateLesson);
router.delete('/teacher/lesson/:lessonId',          teacherOnly, deleteLesson);
router.patch('/teacher/lesson/:lessonId/publish',   teacherOnly, togglePublish);
router.get('/teacher/subject/:subjectId/progress',  teacherOnly, getSubjectStudentProgress);
router.post('/teacher/lesson/:lessonId/pdf',        teacherOnly, uploadPdf.single('pdf'), uploadLessonPdf);
router.delete('/teacher/lesson/:lessonId/pdf/:pdfId', teacherOnly, deleteLessonPdf);

module.exports = router;
