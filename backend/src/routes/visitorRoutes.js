const express = require('express');
const router = express.Router();
const {
  addVisitor, getVisitors, updateVisitor, deleteVisitor,
  getAdmissionRequests, approveAdmissionRequest, rejectAdmissionRequest,
} = require('../controllers/visitorController');
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');

router.post('/add',                              addVisitor);           // Public
router.get('/admission-requests',  protect, staffOnly, getAdmissionRequests);
router.post('/:id/approve',        protect, adminOnly, approveAdmissionRequest);
router.post('/:id/reject',         protect, adminOnly, rejectAdmissionRequest);
router.get('/',                    protect, staffOnly, getVisitors);
router.put('/:id',                 protect, staffOnly, updateVisitor);
router.delete('/:id',              protect, adminOnly, deleteVisitor);

module.exports = router;
