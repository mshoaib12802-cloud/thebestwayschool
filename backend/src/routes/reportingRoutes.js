const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const { getPeople, getStudentReport, getStaffReport } = require('../controllers/reportingController');

router.get('/people',        protect, staffOnly, getPeople);
router.get('/student/:id',   protect, staffOnly, getStudentReport);
router.get('/staff/:id',     protect, staffOnly, getStaffReport);

module.exports = router;
