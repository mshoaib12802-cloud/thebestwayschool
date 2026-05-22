const express = require('express');
const router = express.Router();
const { getDashboardStats, getAtRiskStudents } = require('../controllers/dashboardController');
const { protect, staffOnly } = require('../middlewares/authMiddleware');

router.get('/stats',   protect, staffOnly, getDashboardStats);
router.get('/at-risk', protect, staffOnly, getAtRiskStudents);

module.exports = router;
