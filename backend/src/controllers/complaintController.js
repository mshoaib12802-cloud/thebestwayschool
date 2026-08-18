const Complaint = require('../models/Complaint');
const audit     = require('../utils/auditLogger');

const getAll = async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const total     = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .populate('assigned_to', 'name')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.json({ complaints, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ submitted_by_id: req.user._id || req.user.student_id })
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getById = async (req, res) => {
  try {
    const c = await Complaint.findById(req.params.id).populate('assigned_to', 'name');
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json(c);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const create = async (req, res) => {
  try {
    const { category, priority, title, description, is_anonymous } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'Title and description are required' });

    const user = req.user;
    const complaint = await Complaint.create({
      submitted_by_type: user.role === 'student' ? 'student' : user.role === 'parent' ? 'parent' : 'staff',
      submitted_by_id:   user._id,
      submitted_by_name: is_anonymous ? 'Anonymous' : user.name,
      category:    category || 'other',
      priority:    priority || 'medium',
      title,
      description,
      is_anonymous: !!is_anonymous,
    });

    await audit({ req, action: 'create', module: 'Complaints', entity_id: complaint._id, entity_label: title, description: `Complaint submitted: ${title}` });
    res.status(201).json(complaint);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const reply = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Reply message required' });
    const c = await Complaint.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found' });

    c.replies.push({ by: req.user._id, by_name: req.user.name, by_role: req.user.role, message });
    if (c.status === 'open') c.status = 'in_progress';
    await c.save();
    res.json(c);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateStatus = async (req, res) => {
  try {
    const { status, resolution, assigned_to } = req.body;
    const c = await Complaint.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found' });

    if (status)      c.status  = status;
    if (resolution)  c.resolution = resolution;
    if (assigned_to) c.assigned_to = assigned_to;
    if (status === 'resolved' || status === 'closed') c.resolved_at = new Date();

    await c.save();
    await audit({ req, action: 'update', module: 'Complaints', entity_id: c._id, entity_label: c.ticket_no, description: `Complaint status: ${status}` });
    res.json(c);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getStats = async (req, res) => {
  try {
    const [byStatus, byCategory, recent] = await Promise.all([
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Complaint.find().sort({ createdAt: -1 }).limit(5).select('ticket_no title status priority createdAt'),
    ]);
    res.json({ byStatus, byCategory, recent });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAll, getMyComplaints, getById, create, reply, updateStatus, getStats };
