const express = require('express');
const router = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const {
  getFines, getStudentFines, getStaffFines,
  issueFine, payFine, waiveFine, deleteFine, getFineSummary,
} = require('../controllers/fineController');

router.use(protect, staffOnly);

router.get('/summary',            getFineSummary);
router.get('/student/:studentId', getStudentFines);
router.get('/staff/:staffId',     getStaffFines);
router.get('/',                   getFines);
router.post('/',                  issueFine);
router.put('/:id/pay',            payFine);
router.put('/:id/waive',          waiveFine);
router.delete('/:id',             deleteFine);

module.exports = router;
