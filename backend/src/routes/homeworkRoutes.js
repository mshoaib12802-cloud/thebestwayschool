const express = require('express');
const router  = express.Router();
const { protect, staffOnly, staffOrTeacher } = require('../middlewares/authMiddleware');
const { getHomework, getForStudent, create, update, remove } = require('../controllers/homeworkController');

router.get('/',                   protect, staffOrTeacher, getHomework);
router.get('/my/:studentId',      protect, getForStudent);
router.get('/student',            protect, getForStudent);  // uses req.user.student_id
router.post('/',                  protect, staffOrTeacher, create);
router.put('/:id',                protect, staffOrTeacher, update);
router.delete('/:id',             protect, staffOrTeacher, remove);

module.exports = router;
