const express = require('express');
const router = express.Router();
const {
  addStudent, getStudents, updateStudent, deleteStudent,
  graduateStudent, getStudentCredentials, setInstallments, familyLookup,
} = require('../controllers/studentController');
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

router.post('/add',               protect, staffOnly,  upload.single('photo'), addStudent);
router.get('/family-lookup',      protect, staffOnly,  familyLookup);
router.get('/',                   protect, staffOnly,  getStudents);
router.put('/:id',                protect, staffOnly,  upload.single('photo'), updateStudent);
router.delete('/:id',             protect, adminOnly,  deleteStudent);
router.put('/:id/graduate',       protect, staffOnly,  graduateStudent);
router.get('/:id/credentials',    protect, adminOnly,  getStudentCredentials);
router.put('/:id/installments',   protect, staffOnly,  setInstallments);

module.exports = router;
