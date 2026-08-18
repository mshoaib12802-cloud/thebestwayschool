const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getPapers, getPaper, createPaper, updatePaper, deletePaper } = require('../controllers/examPaperController');

router.get('/',       protect, getPapers);
router.get('/:id',    protect, getPaper);
router.post('/',      protect, createPaper);
router.put('/:id',    protect, updatePaper);
router.delete('/:id', protect, deletePaper);

module.exports = router;
