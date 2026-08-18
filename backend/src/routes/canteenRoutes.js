const express = require('express');
const router  = express.Router();
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');
const {
  getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem,
  getClassCharges, bulkSaveCharges, addDailyLog, removeDailyLog,
  pushToInvoices, getMonthlyReport,
} = require('../controllers/canteenController');

router.get('/menu',          protect, staffOnly,  getMenuItems);
router.post('/menu',         protect, adminOnly,  addMenuItem);
router.put('/menu/:id',      protect, adminOnly,  updateMenuItem);
router.delete('/menu/:id',   protect, adminOnly,  deleteMenuItem);

router.get('/charges',                          protect, staffOnly,  getClassCharges);
router.post('/charges/bulk',                    protect, staffOnly,  bulkSaveCharges);
router.post('/charges/:id/daily-log',           protect, staffOnly,  addDailyLog);
router.delete('/charges/:id/daily-log/:logId',  protect, staffOnly,  removeDailyLog);

router.post('/push-to-invoices',  protect, staffOnly,  pushToInvoices);
router.get('/report',             protect, staffOnly,  getMonthlyReport);

module.exports = router;
