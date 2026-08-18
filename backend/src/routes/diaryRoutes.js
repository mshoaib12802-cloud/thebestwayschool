const express = require('express');
const router  = express.Router();
const { protect, staffOnly, adminOnly, studentOnly, parentOnly } = require('../middlewares/authMiddleware');
const { getDiaryEntries, createDiaryEntry, updateDiaryEntry, deleteDiaryEntry } = require('../controllers/diaryController');

router.get('/',    protect, staffOnly, getDiaryEntries);
router.post('/',   protect, staffOnly, createDiaryEntry);
router.patch('/:id', protect, staffOnly, updateDiaryEntry);
router.delete('/:id', protect, adminOnly, deleteDiaryEntry);

module.exports = router;
