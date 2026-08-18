const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly } = require('../middlewares/authMiddleware');
const {
  getFeeHeads, addFeeHead, updateFeeHead, deleteFeeHead,
  getFeeStructures, upsertFeeStructure, deleteFeeStructure,
  generateInvoices, getInvoices, recordPayment,
  getStudentInvoices, getChildInvoices, createSingleInvoice,
} = require('../controllers/feeStructureController');

router.get('/fee-heads',           protect, staffOnly, getFeeHeads);
router.post('/fee-heads',          protect, adminOnly, addFeeHead);
router.put('/fee-heads/:id',       protect, adminOnly, updateFeeHead);
router.delete('/fee-heads/:id',    protect, adminOnly, deleteFeeHead);

router.get('/structures',          protect, staffOnly, getFeeStructures);
router.post('/structures',         protect, adminOnly, upsertFeeStructure);
router.delete('/structures/:id',   protect, adminOnly, deleteFeeStructure);

router.post('/generate',                  protect, staffOnly, generateInvoices);
router.get('/invoices',                   protect, staffOnly, getInvoices);
router.post('/invoices/create-single',    protect, staffOnly, createSingleInvoice);
router.post('/invoices/:id/pay',          protect, staffOnly, recordPayment);

module.exports = router;
