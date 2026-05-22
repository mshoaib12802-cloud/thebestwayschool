const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getMyCourses,
  getCourseModulesWithProgress,
  markWatched,
  submitQuiz,
  getCourseCertificate,
  getCourseStudentProgress,
  saveNotes,
  getDiscussions,
  postDiscussion,
  deleteDiscussion,
} = require('../controllers/lmsController');

router.use(protect);

// Student routes
router.get('/my-courses',                         getMyCourses);
router.get('/course/:courseId/modules',            getCourseModulesWithProgress);
router.post('/module/:moduleId/watched',           markWatched);
router.post('/module/:moduleId/quiz',              submitQuiz);
router.get('/course/:courseId/certificate',        getCourseCertificate);

// Notes (student only — enforced in controller)
router.put('/module/:moduleId/notes',              saveNotes);

// Discussions
router.get('/module/:moduleId/discussions',        getDiscussions);
router.post('/module/:moduleId/discussions',       postDiscussion);
router.delete('/discussion/:discussionId',         deleteDiscussion);

// Teacher / Admin routes
router.get('/course/:courseId/student-progress',   getCourseStudentProgress);

module.exports = router;
