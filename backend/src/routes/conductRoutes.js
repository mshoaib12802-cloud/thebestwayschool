const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly, parentOnly } = require('../middlewares/authMiddleware');
const { getConductRecords, addConductRecord, updateConductRecord, deleteConductRecord, getStudentConduct } = require('../controllers/conductController');

router.get('/',                        protect, staffOnly, getConductRecords);
router.post('/',                       protect, staffOnly, addConductRecord);
router.put('/:id',                     protect, staffOnly, updateConductRecord);
router.delete('/:id',                  protect, adminOnly, deleteConductRecord);
router.get('/child/:studentId',        protect, parentOnly, getStudentConduct);

module.exports = router;
