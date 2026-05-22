const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getProfile, getDashboard, getMyProjects, getMyInvoices, getMyMessages, sendMessage,
  getNotifications, approveMilestone,
} = require('../controllers/clientPortalController');

router.use(protect);

router.get('/profile',        getProfile);
router.get('/dashboard',      getDashboard);
router.get('/projects',       getMyProjects);
router.get('/invoices',       getMyInvoices);
router.get('/messages',       getMyMessages);
router.post('/messages',      sendMessage);
router.get('/notifications',  getNotifications);
router.put('/projects/:projectId/milestones/:milestoneId/approve', approveMilestone);

module.exports = router;
