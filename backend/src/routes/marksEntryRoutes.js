const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly } = require('../middlewares/authMiddleware');
const { getMarksEntries, getMarksEntry, createOrUpdateMarksEntry, saveMarks, deleteMarksEntry } = require('../controllers/marksEntryController');

const staffOrTeacher = (req, res, next) => {
  if (['admin', 'clerk', 'office_boy', 'teacher'].includes(req.user.role)) return next();
  res.status(403).json({ message: 'Forbidden' });
};

router.get('/',         protect, staffOrTeacher, getMarksEntries);
router.post('/',        protect, staffOrTeacher, createOrUpdateMarksEntry);
router.get('/:id',      protect, staffOrTeacher, getMarksEntry);
router.put('/:id',      protect, staffOrTeacher, saveMarks);
router.delete('/:id',   protect, adminOnly, deleteMarksEntry);

module.exports = router;
