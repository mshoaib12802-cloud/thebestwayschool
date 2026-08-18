const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getQuestions, addQuestion, bulkAdd, updateQuestion, deleteQuestion } = require('../controllers/bankQuestionController');

router.get('/',       protect, getQuestions);
router.post('/bulk',  protect, bulkAdd);
router.post('/',      protect, addQuestion);
router.put('/:id',    protect, updateQuestion);
router.delete('/:id', protect, deleteQuestion);

module.exports = router;
