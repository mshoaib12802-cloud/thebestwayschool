const express = require('express');
const router  = express.Router();
const { getReportCards, addReportCard, updateReportCard, deleteReportCard, bulkGenerate } = require('../controllers/reportCardController');
const { protect, adminOnly, staffOrTeacher } = require('../middlewares/authMiddleware');

router.get('/',               protect, staffOrTeacher, getReportCards);
router.post('/',              protect, staffOrTeacher, addReportCard);
router.post('/bulk-generate', protect, staffOrTeacher, bulkGenerate);
router.patch('/:id',          protect, staffOrTeacher, updateReportCard);
router.delete('/:id',         protect, adminOnly,      deleteReportCard);

module.exports = router;
