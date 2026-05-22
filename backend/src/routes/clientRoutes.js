const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getClients, getClient, createClient, updateClient, deleteClient, resetClientCredentials,
  getAllProjects, createProject, updateProject, deleteProject,
  addMilestone, updateMilestone, deleteMilestone,
  getAllInvoices, createInvoice, updateInvoice, deleteInvoice, sendInvoice,
  getClientMessages, sendClientMessage, getUnreadCounts,
  getStaffList,
} = require('../controllers/clientController');

router.use(protect);

// Static routes MUST come before /:id dynamic routes
router.get('/projects',                                          getAllProjects);
router.post('/projects',                                         createProject);
router.put('/projects/:id',                                      updateProject);
router.delete('/projects/:id',                                   deleteProject);
router.post('/projects/:id/milestones',                          addMilestone);
router.put('/projects/:projectId/milestones/:milestoneId',       updateMilestone);
router.delete('/projects/:projectId/milestones/:milestoneId',    deleteMilestone);

router.get('/invoices',                                          getAllInvoices);
router.post('/invoices',                                         createInvoice);
router.put('/invoices/:id',                                      updateInvoice);
router.delete('/invoices/:id',                                   deleteInvoice);

router.get('/unread-counts',                                     getUnreadCounts);
router.get('/staff',                                             getStaffList);
router.post('/invoices/:id/send',                                sendInvoice);

// Dynamic /:id routes last
router.get('/',                                                  getClients);
router.post('/',                                                 createClient);
router.get('/:id',                                               getClient);
router.put('/:id',                                               updateClient);
router.delete('/:id',                                            deleteClient);
router.get('/:id/credentials',                                   resetClientCredentials);
router.get('/:id/messages',                                      getClientMessages);
router.post('/:id/messages',                                     sendClientMessage);

module.exports = router;
