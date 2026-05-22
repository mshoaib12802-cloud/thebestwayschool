const express = require('express');
const router = express.Router();
const { getPublicCourses, getCourses, addCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');

router.get('/public',   getPublicCourses);
router.get('/',         protect, staffOnly, getCourses);
router.post('/add',     protect, staffOnly, addCourse);
router.put('/:id',      protect, staffOnly, updateCourse);
router.delete('/:id',   protect, adminOnly, deleteCourse);

module.exports = router;
