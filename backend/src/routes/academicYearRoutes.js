const express = require('express');
const router = express.Router();
const {
  getAcademicYears, addAcademicYear, updateAcademicYear,
  deleteAcademicYear, setCurrentYear,
} = require('../controllers/academicYearController');
const { protect, staffOrTeacher, adminOnly } = require('../middlewares/authMiddleware');

router.get('/',                protect, staffOrTeacher, getAcademicYears);
router.post('/',               protect, adminOnly, addAcademicYear);
router.put('/:id',             protect, adminOnly, updateAcademicYear);
router.delete('/:id',          protect, adminOnly, deleteAcademicYear);
router.put('/:id/set-current', protect, adminOnly, setCurrentYear);

module.exports = router;
