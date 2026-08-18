const express = require('express');
const router = express.Router();
const { getClasses, addClass, updateClass, deleteClass, getClassStudents } = require('../controllers/classController');
const { protect, staffOnly, staffOrTeacher, adminOnly } = require('../middlewares/authMiddleware');

router.get('/',                 protect, staffOrTeacher, getClasses);
router.post('/',                protect, staffOnly, addClass);
router.put('/:id',              protect, staffOnly, updateClass);
router.delete('/:id',           protect, adminOnly, deleteClass);
router.get('/:id/students',     protect, staffOrTeacher, getClassStudents);

module.exports = router;
