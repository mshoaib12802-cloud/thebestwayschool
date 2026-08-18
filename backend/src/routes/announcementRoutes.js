const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly, studentOnly, parentOnly, teacherOnly } = require('../middlewares/authMiddleware');
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, getStudentAnnouncements, getParentAnnouncements, getTeacherAnnouncements } = require('../controllers/announcementController');

router.get('/',              protect, staffOnly, getAnnouncements);
router.post('/',             protect, staffOnly, createAnnouncement);
router.put('/:id',           protect, staffOnly, updateAnnouncement);
router.delete('/:id',        protect, adminOnly, deleteAnnouncement);

router.get('/student',       protect, studentOnly, getStudentAnnouncements);
router.get('/parent',        protect, parentOnly, getParentAnnouncements);
router.get('/teacher',       protect, teacherOnly, getTeacherAnnouncements);

module.exports = router;
