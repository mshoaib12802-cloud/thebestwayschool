const Client        = require('../models/Client');
const ServiceProject = require('../models/ServiceProject');
const ClientInvoice  = require('../models/ClientInvoice');
const ClientMessage  = require('../models/ClientMessage');
const User           = require('../models/User');
const { sendCredentialsEmail, sendInvoiceEmail } = require('../utils/sendEmail');

const generateSecurePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
};

const calcProgress = (project) => {
  const ms = project.milestones || [];
  if (!ms.length) return 0;
  return Math.round((ms.filter(m => m.status === 'completed').length / ms.length) * 100);
};

// ── Clients ──────────────────────────────────────────────────────────────────

// GET /api/clients
const getClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 }).lean();

    const result = await Promise.all(clients.map(async c => {
      const [projectCount, activeProjects, invoiceAgg] = await Promise.all([
        ServiceProject.countDocuments({ client_id: c._id }),
        ServiceProject.countDocuments({ client_id: c._id, status: { $in: ['planning', 'in_progress', 'review'] } }),
        ClientInvoice.aggregate([
          { $match: { client_id: c._id, status: { $in: ['sent', 'partial', 'overdue'] } } },
          { $group: { _id: null, total: { $sum: { $subtract: ['$total', '$paid_amount'] } } } },
        ]),
      ]);
      return { ...c, project_count: projectCount, active_projects: activeProjects, pending_amount: invoiceAgg[0]?.total || 0 };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/clients/:id
const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).lean();
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const [projects, invoices] = await Promise.all([
      ServiceProject.find({ client_id: client._id }).populate('assigned_to', 'name email').sort({ createdAt: -1 }).lean(),
      ClientInvoice.find({ client_id: client._id }).populate('project_id', 'title').sort({ createdAt: -1 }).lean(),
    ]);

    const projectsWithPct = projects.map(p => ({ ...p, progress_pct: calcProgress(p) }));
    res.json({ ...client, projects: projectsWithPct, invoices });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/clients
const createClient = async (req, res) => {
  try {
    const { company_name, contact_person, email, phone, address, city, industry, website, status, notes, source } = req.body;
    if (!company_name || !contact_person || !email) {
      return res.status(400).json({ message: 'Company name, contact person, and email are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ message: 'Email already in use' });

    const client = await Client.create({
      company_name, contact_person,
      email: email.toLowerCase().trim(),
      phone, address, city, industry, website,
      status: status || 'active', notes, source,
      created_by: req.user._id,
    });

    const plainPassword = generateSecurePassword();
    const userAccount = await User.create({
      name:      contact_person,
      email:     email.toLowerCase().trim(),
      password:  plainPassword,
      role:      'client',
      client_id: client._id,
    });

    client.user_id = userAccount._id;
    await client.save();

    // Send login credentials to client's email (non-blocking)
    sendCredentialsEmail({
      to:       client.email,
      name:     contact_person,
      role:     'client',
      email:    client.email,
      password: plainPassword,
    }).catch(() => {});

    res.status(201).json({ client, credentials: { email: client.email, password: plainPassword } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const { company_name, contact_person, phone, address, city, industry, website, status, notes, source } = req.body;
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: { company_name, contact_person, phone, address, city, industry, website, status, notes, source } },
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (contact_person && client.user_id) {
      await User.findByIdAndUpdate(client.user_id, { name: contact_person });
    }
    res.json(client);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    await Promise.all([
      client.user_id ? User.findByIdAndDelete(client.user_id) : Promise.resolve(),
      ServiceProject.deleteMany({ client_id: client._id }),
      ClientInvoice.deleteMany({ client_id: client._id }),
      ClientMessage.deleteMany({ client_id: client._id }),
    ]);
    await client.deleteOne();
    res.json({ message: 'Client deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/clients/:id/credentials
const resetClientCredentials = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client?.user_id) return res.status(404).json({ message: 'Client or linked user not found' });

    const userAccount = await User.findById(client.user_id);
    if (!userAccount) return res.status(404).json({ message: 'User account not found' });

    const newPassword = generateSecurePassword();
    userAccount.password = newPassword;
    await userAccount.save();

    // Send new credentials to client's email (non-blocking)
    sendCredentialsEmail({
      to:       client.email,
      name:     client.contact_person,
      role:     'client',
      email:    client.email,
      password: newPassword,
    }).catch(() => {});

    res.json({ email: client.email, password: newPassword });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Projects ──────────────────────────────────────────────────────────────────

// GET /api/clients/projects
const getAllProjects = async (req, res) => {
  try {
    const projects = await ServiceProject.find()
      .populate('client_id', 'company_name contact_person')
      .populate('assigned_to', 'name')
      .sort({ createdAt: -1 }).lean();
    res.json(projects.map(p => ({ ...p, progress_pct: calcProgress(p) })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/clients/projects
const createProject = async (req, res) => {
  try {
    const { client_id, title, description, service_type, status, priority, start_date, deadline, budget, assigned_to, client_notes, internal_notes } = req.body;
    if (!client_id || !title) return res.status(400).json({ message: 'Client and title are required' });

    const project = await ServiceProject.create({
      client_id, title, description: description || '',
      service_type: service_type || '',
      status: status || 'planning',
      priority: priority || 'medium',
      start_date, deadline,
      budget: Number(budget) || 0,
      currency: 'PKR',
      assigned_to: assigned_to || [],
      client_notes: client_notes || '',
      internal_notes: internal_notes || '',
      milestones: [],
      created_by: req.user._id,
    });

    const populated = await ServiceProject.findById(project._id)
      .populate('client_id', 'company_name contact_person')
      .populate('assigned_to', 'name').lean();
    res.status(201).json({ ...populated, progress_pct: 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/clients/projects/:id
const updateProject = async (req, res) => {
  try {
    const allowed = ['title', 'description', 'service_type', 'status', 'priority', 'start_date', 'deadline', 'budget', 'paid_amount', 'assigned_to', 'is_visible_to_client', 'client_notes', 'internal_notes'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const project = await ServiceProject.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
      .populate('client_id', 'company_name contact_person')
      .populate('assigned_to', 'name').lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ ...project, progress_pct: calcProgress(project) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/clients/projects/:id
const deleteProject = async (req, res) => {
  try {
    await ServiceProject.findByIdAndDelete(req.params.id);
    await ClientInvoice.updateMany({ project_id: req.params.id }, { $set: { project_id: null } });
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/clients/projects/:id/milestones
const addMilestone = async (req, res) => {
  try {
    const { title, description, due_date } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const project = await ServiceProject.findByIdAndUpdate(
      req.params.id,
      { $push: { milestones: { title, description: description || '', due_date, status: 'pending' } } },
      { new: true }
    ).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ ...project, progress_pct: calcProgress(project) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/clients/projects/:projectId/milestones/:milestoneId
const updateMilestone = async (req, res) => {
  try {
    const { title, description, status, due_date } = req.body;
    const setFields = {};
    if (title       !== undefined) setFields['milestones.$.title']          = title;
    if (description !== undefined) setFields['milestones.$.description']    = description;
    if (due_date    !== undefined) setFields['milestones.$.due_date']       = due_date;
    if (status      !== undefined) {
      setFields['milestones.$.status']         = status;
      setFields['milestones.$.completed_date'] = status === 'completed' ? new Date() : null;
    }

    const project = await ServiceProject.findOneAndUpdate(
      { _id: req.params.projectId, 'milestones._id': req.params.milestoneId },
      { $set: setFields },
      { new: true }
    ).lean();
    if (!project) return res.status(404).json({ message: 'Not found' });
    res.json({ ...project, progress_pct: calcProgress(project) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/clients/projects/:projectId/milestones/:milestoneId
const deleteMilestone = async (req, res) => {
  try {
    const project = await ServiceProject.findByIdAndUpdate(
      req.params.projectId,
      { $pull: { milestones: { _id: req.params.milestoneId } } },
      { new: true }
    ).lean();
    if (!project) return res.status(404).json({ message: 'Not found' });
    res.json({ ...project, progress_pct: calcProgress(project) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Invoices ──────────────────────────────────────────────────────────────────

// GET /api/clients/invoices
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await ClientInvoice.find()
      .populate('client_id', 'company_name contact_person')
      .populate('project_id', 'title')
      .sort({ createdAt: -1 }).lean();
    res.json(invoices);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/clients/invoices
const createInvoice = async (req, res) => {
  try {
    const { client_id, project_id, title, items, tax_pct, due_date, notes } = req.body;
    if (!client_id || !title || !items?.length) {
      return res.status(400).json({ message: 'Client, title, and at least one item are required' });
    }

    const count = await ClientInvoice.countDocuments();
    const invoice_no = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const lineItems = items.map(i => ({
      description: i.description || 'Service',
      quantity:    Number(i.quantity) || 1,
      unit_price:  Number(i.unit_price) || 0,
      total:       (Number(i.quantity) || 1) * (Number(i.unit_price) || 0),
    }));

    const subtotal   = lineItems.reduce((s, i) => s + i.total, 0);
    const taxPct     = Number(tax_pct) || 0;
    const tax_amount = Math.round(subtotal * taxPct / 100);
    const total      = subtotal + tax_amount;

    const invoice = await ClientInvoice.create({
      client_id, project_id: project_id || null,
      invoice_no, title,
      items: lineItems,
      subtotal, tax_pct: taxPct, tax_amount, total,
      paid_amount: 0, status: 'draft',
      issue_date: new Date(), due_date, notes: notes || '',
      created_by: req.user._id,
    });

    const populated = await ClientInvoice.findById(invoice._id)
      .populate('client_id', 'company_name contact_person')
      .populate('project_id', 'title').lean();
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/clients/invoices/:id
const updateInvoice = async (req, res) => {
  try {
    const { status, paid_amount, due_date, notes, title } = req.body;
    const invoice = await ClientInvoice.findByIdAndUpdate(
      req.params.id,
      { $set: { status, paid_amount, due_date, notes, title } },
      { new: true }
    ).populate('client_id', 'company_name').populate('project_id', 'title').lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/clients/invoices/:id
const deleteInvoice = async (req, res) => {
  try {
    await ClientInvoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/clients/invoices/:id/send  — email invoice to client + mark as sent
const sendInvoice = async (req, res) => {
  try {
    const invoice = await ClientInvoice.findById(req.params.id)
      .populate('client_id', 'company_name contact_person email').lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const updated = await ClientInvoice.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'sent' } },
      { new: true }
    ).populate('client_id', 'company_name').populate('project_id', 'title').lean();

    sendInvoiceEmail({
      to:         invoice.client_id.email,
      clientName: invoice.client_id.company_name || invoice.client_id.contact_person,
      invoice,
    }).catch(() => {});

    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/clients/staff  — staff list for project assignment
const getStaffList = async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: ['admin', 'clerk'] } })
      .select('name email role').sort({ name: 1 }).lean();
    res.json(staff);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Messages ──────────────────────────────────────────────────────────────────

// GET /api/clients/:id/messages
const getClientMessages = async (req, res) => {
  try {
    const messages = await ClientMessage.find({ client_id: req.params.id })
      .populate('sender_id', 'name role')
      .sort({ createdAt: 1 }).lean();

    await ClientMessage.updateMany(
      { client_id: req.params.id, sender_type: 'client', is_read_by_staff: false },
      { is_read_by_staff: true }
    );

    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/clients/:id/messages
const sendClientMessage = async (req, res) => {
  try {
    const { message, project_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message required' });

    const msg = await ClientMessage.create({
      client_id:  req.params.id,
      project_id: project_id || null,
      sender_type: 'staff',
      sender_id:  req.user._id,
      message:    message.trim(),
      is_read_by_staff:  true,
      is_read_by_client: false,
    });

    const populated = await ClientMessage.findById(msg._id).populate('sender_id', 'name role').lean();
    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/clients/unread-counts  (for admin notification badge)
const getUnreadCounts = async (req, res) => {
  try {
    const counts = await ClientMessage.aggregate([
      { $match: { sender_type: 'client', is_read_by_staff: false } },
      { $group: { _id: '$client_id', count: { $sum: 1 } } },
    ]);
    res.json(counts);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getClients, getClient, createClient, updateClient, deleteClient, resetClientCredentials,
  getAllProjects, createProject, updateProject, deleteProject,
  addMilestone, updateMilestone, deleteMilestone,
  getAllInvoices, createInvoice, updateInvoice, deleteInvoice, sendInvoice,
  getClientMessages, sendClientMessage, getUnreadCounts,
  getStaffList,
};
