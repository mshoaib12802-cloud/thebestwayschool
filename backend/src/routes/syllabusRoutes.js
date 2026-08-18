const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const { getSyllabus, getAllSyllabi, upsertSyllabus, toggleTopic, getByTeacher } = require('../controllers/syllabusController');

router.get('/all',        protect, getAllSyllabi);
router.get('/by-teacher', protect, getByTeacher);
router.get('/',           protect, getSyllabus);
router.post('/',          protect, upsertSyllabus);
router.patch('/:id/topic', protect, toggleTopic);

module.exports = router;
