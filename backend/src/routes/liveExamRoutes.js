const express = require('express');
const router  = express.Router();
const { protect, staffOnly, studentOnly } = require('../middlewares/authMiddleware');
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
router.get('/',                    protect, staffOnly, getLiveExams);
router.post('/',                   protect, staffOnly, createLiveExam);
router.put('/:id',                 protect, staffOnly, updateLiveExam);
router.delete('/:id',              protect, staffOnly, deleteLiveExam);
router.patch('/:id/publish',       protect, staffOnly, publishToggleLive);
router.get('/:id/questions',       protect, staffOnly, getQuestions);
router.post('/:id/questions',      protect, staffOnly, addQuestion);
router.post('/:id/questions/import', protect, staffOnly, importQuestions);
router.put('/:id/questions/:qid',  protect, staffOnly, updateQuestion);
router.delete('/:id/questions/:qid', protect, staffOnly, deleteQuestion);
router.get('/:id/attempts',        protect, staffOnly, getLiveExamAttempts);

module.exports = router;
