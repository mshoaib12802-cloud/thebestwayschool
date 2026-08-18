const StaffAdvance = require('../models/StaffAdvance');

const getAdvances = async (req, res) => {
  try {
    const { staff_id, status } = req.query;
    const filter = {};
    if (staff_id) filter.staff_id = staff_id;
    if (status) filter.status = status;
    const advances = await StaffAdvance.find(filter)
      .populate('staff_id', 'name email role')
      .populate('approved_by', 'name')
      .sort({ createdAt: -1 });
    res.json(advances);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const applyAdvance = async (req, res) => {
  try {
    const { amount, reason, recovery_months } = req.body;
    const advance = await StaffAdvance.create({ staff_id: req.user._id, amount, reason, recovery_months: recovery_months || 1 });
    res.status(201).json(advance);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getMyAdvances = async (req, res) => {
  try {
    const advances = await StaffAdvance.find({ staff_id: req.user._id }).sort({ createdAt: -1 });
    res.json(advances);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const reviewAdvance = async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });
    const advance = await StaffAdvance.findByIdAndUpdate(req.params.id, {
      status, notes, approved_by: req.user._id, approved_date: new Date(),
    }, { new: true }).populate('staff_id', 'name email');
    res.json(advance);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteAdvance = async (req, res) => {
  try {
    await StaffAdvance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getAdvances, applyAdvance, getMyAdvances, reviewAdvance, deleteAdvance };
