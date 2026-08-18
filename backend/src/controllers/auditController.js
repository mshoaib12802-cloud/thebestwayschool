const AuditLog = require('../models/AuditLog');

const getLogs = async (req, res) => {
  try {
    const { user_id, module, action, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (module)  filter.module  = { $regex: module, $options: 'i' };
    if (action)  filter.action  = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const total = await AuditLog.countDocuments(filter);
    const logs  = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    res.json({ logs, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getModules = async (req, res) => {
  try {
    const modules = await AuditLog.distinct('module');
    res.json(modules.sort());
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteOld = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({ deleted: result.deletedCount, message: `Deleted logs older than ${days} days` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getLogs, getModules, deleteOld };
