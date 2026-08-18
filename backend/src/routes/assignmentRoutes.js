const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly, teacherOnly, studentOnly, parentOnly } = require('../middlewares/authMiddleware');
const {
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getSubmissions, gradeSubmission,
  getMyAssignments, submitAssignment, getMySubmission,
  getChildAssignments,
} = require('../controllers/assignmentController');

// Staff/Teacher
router.get('/',                                protect, (req, res, next) => { if (['admin','clerk','office_boy','teacher'].includes(req.user.role)) next(); else res.status(403).json({ message: 'Forbidden' }); }, getAssignments);
router.post('/',                               protect, (req, res, next) => { if (['admin','clerk','teacher'].includes(req.user.role)) next(); else res.status(403).json({ message: 'Forbidden' }); }, createAssignment);
router.put('/:id',                             protect, (req, res, next) => { if (['admin','clerk','teacher'].includes(req.user.role)) next(); else res.status(403).json({ message: 'Forbidden' }); }, updateAssignment);
router.delete('/:id',                          protect, adminOnly, deleteAssignment);
router.get('/:id/submissions',                 protect, (req, res, next) => { if (['admin','clerk','teacher'].includes(req.user.role)) next(); else res.status(403).json({ message: 'Forbidden' }); }, getSubmissions);
router.put('/:id/submissions/:submissionId',   protect, (req, res, next) => { if (['admin','clerk','teacher'].includes(req.user.role)) next(); else res.status(403).json({ message: 'Forbidden' }); }, gradeSubmission);

// Student
router.get('/my/list',         protect, studentOnly, getMyAssignments);
router.post('/:id/submit',     protect, studentOnly, submitAssignment);
router.get('/:id/my-submission', protect, studentOnly, getMySubmission);

// Parent
router.get('/child/:studentId', protect, parentOnly, getChildAssignments);

module.exports = router;
