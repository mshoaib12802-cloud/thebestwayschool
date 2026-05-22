const express = require('express');
const router = express.Router();
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');
const {
  createExam, getExams, updateExam, deleteExam,
  publishToggle,
  getExamResults, saveResult, bulkSaveResults,
  getExamAnalytics,
  getStudentResults,
  getStudentReportCard,
  getExamBatchComparison,
} = require('../controllers/examController');

router.get('/',                               protect, staffOnly,  getExams);
router.post('/',                              protect, staffOnly,  createExam);
router.put('/:id',                            protect, staffOnly,  updateExam);
router.delete('/:id',                         protect, adminOnly,  deleteExam);
router.patch('/:id/publish',                  protect, staffOnly,  publishToggle);
router.get('/:id/results',                    protect, staffOnly,  getExamResults);
router.get('/:id/analytics',                  protect, staffOnly,  getExamAnalytics);
router.post('/results',                       protect, staffOnly,  saveResult);
router.post('/:id/bulk-results',              protect, staffOnly,  bulkSaveResults);
router.get('/student/:student_id/results',    protect, staffOnly,  getStudentResults);
router.get('/report-card/:student_id',        protect, staffOnly,  getStudentReportCard);
router.get('/:id/batch-comparison',           protect, staffOnly,  getExamBatchComparison);

module.exports = router;
