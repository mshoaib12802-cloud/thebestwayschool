const express = require('express');
const router  = express.Router();
const { protect, staffOrTeacher, studentOnly } = require('../middlewares/authMiddleware');
const {
  getLiveExams, createLiveExam, updateLiveExam, deleteLiveExam, publishToggleLive,
  getQuestions, addQuestion, updateQuestion, deleteQuestion, importQuestions,
  getLiveExamAttempts,
  getStudentLiveExams, startLiveExam, getLiveExamForStudent, submitLiveExam,
  getStudentLiveResults, getAttemptReview,
} = require('../controllers/liveExamController');

// Student portal routes — must come BEFORE dynamic /:id routes
router.get('/student/available',            protect, studentOnly, getStudentLiveExams);
router.get('/student/results',              protect, studentOnly, getStudentLiveResults);
router.get('/student/attempts/:id/review',  protect, studentOnly, getAttemptReview);
router.post('/student/:id/start',           protect, studentOnly, startLiveExam);
router.get('/student/:id/take',             protect, studentOnly, getLiveExamForStudent);
router.post('/student/:id/submit',          protect, studentOnly, submitLiveExam);

// Admin / Staff routes
router.get('/',                    protect, staffOrTeacher, getLiveExams);
router.post('/',                   protect, staffOrTeacher, createLiveExam);
router.put('/:id',                 protect, staffOrTeacher, updateLiveExam);
router.delete('/:id',              protect, staffOrTeacher, deleteLiveExam);
router.patch('/:id/publish',       protect, staffOrTeacher, publishToggleLive);
router.get('/:id/questions',       protect, staffOrTeacher, getQuestions);
router.post('/:id/questions',      protect, staffOrTeacher, addQuestion);
router.post('/:id/questions/import', protect, staffOrTeacher, importQuestions);
router.put('/:id/questions/:qid',  protect, staffOrTeacher, updateQuestion);
router.delete('/:id/questions/:qid', protect, staffOrTeacher, deleteQuestion);
router.get('/:id/attempts',        protect, staffOrTeacher, getLiveExamAttempts);

module.exports = router;
