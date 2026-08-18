const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly } = require('../middlewares/authMiddleware');
const { getPayrolls, generatePayrolls, updatePayroll, markPayrollPaid, getMyPayrolls } = require('../controllers/payrollController');

router.get('/',              protect, staffOnly, getPayrolls);
router.post('/generate',     protect, adminOnly, generatePayrolls);
router.put('/:id',           protect, adminOnly, updatePayroll);
router.post('/:id/pay',      protect, adminOnly, markPayrollPaid);
router.get('/my',            protect, getMyPayrolls);

module.exports = router;
