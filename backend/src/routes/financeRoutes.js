const express = require('express');
const router = express.Router();
const {
  collectFee, addExpense, paySalary, deleteExpense,
  payAllSalaries, getFinanceTrend,
  getRecurringExpenses, addRecurringExpense, deleteRecurringExpense,
  getMonthlyFinance, getStudentStatement, getTrainerEarnings,
  resendSalarySlip,
} = require('../controllers/financeController');
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');

router.post('/collect-fee',          protect, staffOnly,  collectFee);
router.post('/add-expense',          protect, staffOnly,  addExpense);
router.post('/pay-salary',           protect, adminOnly,  paySalary);
router.post('/resend-salary-slip',   protect, adminOnly,  resendSalarySlip);
router.post('/pay-all-salaries',     protect, adminOnly,  payAllSalaries);
router.get('/monthly',               protect, staffOnly,  getMonthlyFinance);
router.get('/trend',                 protect, staffOnly,  getFinanceTrend);
router.get('/student/:id',           protect, staffOnly,  getStudentStatement);
router.get('/trainer/:id/earnings',  protect, adminOnly,  getTrainerEarnings);
router.delete('/expense/:id',        protect, adminOnly,  deleteExpense);
router.get('/recurring-expenses',    protect, staffOnly,  getRecurringExpenses);
router.post('/recurring-expenses',   protect, adminOnly,  addRecurringExpense);
router.delete('/recurring-expenses/:id', protect, adminOnly, deleteRecurringExpense);

module.exports = router;
