const express = require('express');
const router = express.Router();
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');
const {
  getDateSheets, getDateSheet, getCourseStudents,
  createDateSheet, updateDateSheet, togglePublish, deleteDateSheet,
} = require('../controllers/dateSheetController');

router.get('/',                              protect, staffOnly, getDateSheets);
router.get('/course/:courseId/students',     protect, staffOnly, getCourseStudents);
router.get('/:id',                           protect, staffOnly, getDateSheet);
router.post('/add',                          protect, staffOnly, createDateSheet);
router.put('/:id',                           protect, staffOnly, updateDateSheet);
router.put('/:id/publish',                   protect, staffOnly, togglePublish);
router.delete('/:id',                        protect, adminOnly, deleteDateSheet);

module.exports = router;
