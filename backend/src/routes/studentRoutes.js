const express = require('express');
const router = express.Router();
const {
  addStudent, getStudents, updateStudent, deleteStudent,
  graduateStudent, getStudentCredentials, setInstallments
} = require('../controllers/studentController');
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');

router.post('/add',               protect, staffOnly,  addStudent);
router.get('/',                   protect, staffOnly,  getStudents);
router.put('/:id',                protect, staffOnly,  updateStudent);
router.delete('/:id',             protect, adminOnly,  deleteStudent);
router.put('/:id/graduate',       protect, staffOnly,  graduateStudent);
router.get('/:id/credentials',    protect, adminOnly,  getStudentCredentials);
router.put('/:id/installments',   protect, staffOnly,  setInstallments);

module.exports = router;
