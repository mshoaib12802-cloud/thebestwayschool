const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const { getOverview, getAttendanceTrends, getFeeTrends, getAcademicPerformance, getAtRiskStudents, getEnrollment, getFinancialDashboard } = require('../controllers/analyticsController');

router.use(protect, staffOnly);

router.get('/overview',    getOverview);
router.get('/attendance',  getAttendanceTrends);
router.get('/fees',        getFeeTrends);
router.get('/academic',    getAcademicPerformance);
router.get('/at-risk',     getAtRiskStudents);
router.get('/enrollment',           getEnrollment);
router.get('/financial-dashboard',  getFinancialDashboard);

module.exports = router;
