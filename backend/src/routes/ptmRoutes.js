const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly, parentOnly } = require('../middlewares/authMiddleware');
const { getPTMs, createPTM, updatePTM, deletePTM, bookSlot, getParentPTMs } = require('../controllers/ptmController');

const staffOrTeacher = (req, res, next) => {
  if (['admin', 'clerk', 'office_boy', 'teacher'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'Forbidden' });
};

router.get('/',                        protect, staffOrTeacher, getPTMs);
router.post('/',                       protect, staffOrTeacher, createPTM);
router.put('/:id',                     protect, staffOrTeacher, updatePTM);
router.delete('/:id',                  protect, adminOnly, deletePTM);
router.post('/book-slot',              protect, parentOnly, bookSlot);
router.get('/parent/:studentId',       protect, parentOnly, getParentPTMs);

module.exports = router;
