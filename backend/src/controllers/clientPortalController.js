const Client         = require('../models/Client');
const ServiceProject = require('../models/ServiceProject');
const ClientInvoice  = require('../models/ClientInvoice');
const ClientMessage  = require('../models/ClientMessage');
const User           = require('../models/User');

const getClientId = async (userId) => {
  const user = await User.findById(userId).select('client_id').lean();
  return user?.client_id;
};

const calcProgress = (project) => {
  const ms = project.milestones || [];
  if (!ms.length) return 0;
  return Math.round((ms.filter(m => m.status === 'completed').length / ms.length) * 100);
};

// GET /api/client-portal/profile
const getProfile = async (req, res) => {
  try {
    const clientId = await getClientId(req.user._id);
    if (!clientId) return res.status(404).json({ message: 'Client profile not found' });
    const client = await Client.findById(clientId).lean();
    res.json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/client-portal/dashboard
const getDashboard = async (req, res) => {
  try {
    const clientId = await getClientId(req.user._id);
    if (!clientId) return res.status(404).json({ message: 'Not found' });

    const [projects, invoices, unreadCount] = await Promise.all([
      ServiceProject.find({ client_id: clientId, is_visible_to_client: true }).sort({ updatedAt: -1 }).lean(),
      ClientInvoice.find({ client_id: clientId }).populate('project_id', 'title').sort({ createdAt: -1 }).lean(),
      ClientMessage.countDocuments({ client_id: clientId, sender_type: 'staff', is_read_by_client: false }),
    ]);

    const projectsWithPct = projects.map(p => ({ ...p, progress_pct: calcProgress(p) }));
    const activeProjects    = projects.filter(p => ['planning', 'in_progress', 'review'].includes(p.status));
    const completedProjects = projects.filter(p => p.status === 'completed');
    const pendingInvoices   = invoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status));
    const pendingAmount     = pendingInvoices.reduce((s, i) => s + (i.total - i.paid_amount), 0);
    const paidAmount        = invoices.reduce((s, i) => s + i.paid_amount, 0);

    res.json({
      stats: {
        total_projects:     projects.length,
        active_projects:    activeProjects.length,
        completed_projects: completedProjects.length,
        total_invoices:     invoices.length,
        pending_amount:     pendingAmount,
        paid_amount:        paidAmount,
        unread_messages:    unreadCount,
      },
      recent_projects: projectsWithPct.slice(0, 4),
      recent_invoices: invoices.slice(0, 4),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/client-portal/projects
const getMyProjects = async (req, res) => {
  try {
    const clientId = await getClientId(req.user._id);
    if (!clientId) return res.status(404).json({ message: 'Not found' });

    const projects = await ServiceProject.find({ client_id: clientId, is_visible_to_client: true })
      .populate('assigned_to', 'name')
      .sort({ createdAt: -1 }).lean();

    res.json(projects.map(p => ({ ...p, progress_pct: calcProgress(p) })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/client-portal/invoices
const getMyInvoices = async (req, res) => {
  try {
    const clientId = await getClientId(req.user._id);
    if (!clientId) return res.status(404).json({ message: 'Not found' });

    const invoices = await ClientInvoice.find({ client_id: clientId })
      .populate('project_id', 'title')
      .sort({ createdAt: -1 }).lean();
    res.json(invoices);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/client-portal/messages
const getMyMessages = async (req, res) => {
  try {
    const clientId = await getClientId(req.user._id);
    if (!clientId) return res.status(404).json({ message: 'Not found' });

    const messages = await ClientMessage.find({ client_id: clientId })
      .populate('sender_id', 'name role')
      .sort({ createdAt: 1 }).lean();

    await ClientMessage.updateMany(
      { client_id: clientId, sender_type: 'staff', is_read_by_client: false },
      { is_read_by_client: true }
    );

    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/client-portal/notifications
const getNotifications = async (req, res) => {
  try {
    const clientId = await getClientId(req.user._id);
    if (!clientId) return res.status(404).json({ message: 'Not found' });

    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [unreadMessages, overdueInvoices, upcomingDeadlines] = await Promise.all([
      ClientMessage.countDocuments({ client_id: clientId, sender_type: 'staff', is_read_by_client: false }),
      ClientInvoice.countDocuments({ client_id: clientId, status: 'overdue' }),
      ServiceProject.countDocuments({
        client_id: clientId,
        is_visible_to_client: true,
        status: { $in: ['planning', 'in_progress', 'review'] },
        deadline: { $gte: now, $lte: sevenDays },
      }),
    ]);

    res.json({ unread_messages: unreadMessages, overdue_invoices: overdueInvoices, upcoming_deadlines: upcomingDeadlines });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/client-portal/projects/:projectId/milestones/:milestoneId/approve
const approveMilestone = async (req, res) => {
  try {
    const clientId = await getClientId(req.user._id);
    if (!clientId) return res.status(403).json({ message: 'Forbidden' });

    const project = await ServiceProject.findOneAndUpdate(
      { _id: req.params.projectId, client_id: clientId, 'milestones._id': req.params.milestoneId },
      { $set: { 'milestones.$.client_approved': true, 'milestones.$.client_approved_at': new Date() } },
      { new: true }
    ).lean();
    if (!project) return res.status(404).json({ message: 'Not found' });
    res.json({ ...project, progress_pct: calcProgress(project) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/client-portal/messages
const sendMessage = async (req, res) => {
  try {
    const clientId = await getClientId(req.user._id);
    if (!clientId) return res.status(404).json({ message: 'Not found' });

    const { message, project_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message required' });

    const msg = await ClientMessage.create({
      client_id:  clientId,
      project_id: project_id || null,
      sender_type: 'client',
      sender_id:  req.user._id,
      message:    message.trim().slice(0, 3000),
      is_read_by_client: true,
      is_read_by_staff:  false,
    });

    const populated = await ClientMessage.findById(msg._id).populate('sender_id', 'name role').lean();
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getProfile, getDashboard, getMyProjects, getMyInvoices, getMyMessages, sendMessage, getNotifications, approveMilestone };
