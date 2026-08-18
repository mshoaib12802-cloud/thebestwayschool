const express = require('express');
const router = express.Router();
const { getPeriods, getAllPeriods, addPeriod, updatePeriod, deletePeriod, reorderPeriods } = require('../controllers/periodController');
const { protect, staffOnly, adminOnly, staffOrTeacher } = require('../middlewares/authMiddleware');

router.get('/',         protect, getAllPeriods);
router.get('/active',   protect, getPeriods);
router.post('/',        protect, staffOnly, addPeriod);
router.put('/reorder',  protect, adminOnly, reorderPeriods);
router.put('/:id',      protect, staffOnly, updatePeriod);
router.delete('/:id',   protect, adminOnly, deletePeriod);

module.exports = router;
