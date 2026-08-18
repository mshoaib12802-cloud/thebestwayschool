const express = require('express');
const router = express.Router();
const { getSubjects, addSubject, updateSubject, deleteSubject } = require('../controllers/subjectController');
const { protect, staffOnly, adminOnly, staffOrTeacher } = require('../middlewares/authMiddleware');

router.get('/',        protect, staffOrTeacher, getSubjects);
router.post('/',       protect, staffOnly,      addSubject);
router.put('/:id',     protect, staffOnly,      updateSubject);
router.delete('/:id',  protect, adminOnly,      deleteSubject);

module.exports = router;
