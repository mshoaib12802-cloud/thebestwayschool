const Event = require('../models/Event');

const getEvents = async (req, res) => {
  try {
    const { audience, from, to } = req.query;
    const filter = { is_active: true };
    if (audience) filter.audience = { $in: [audience, 'all'] };
    if (from || to) {
      filter.start_date = {};
      if (from) filter.start_date.$gte = new Date(from);
      if (to) filter.start_date.$lte = new Date(to);
    }
    const events = await Event.find(filter)
      .populate('created_by', 'name')
      .populate('class_ids', 'grade section')
      .sort({ start_date: 1 });
    res.json(events);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const createEvent = async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, created_by: req.user._id });
    res.status(201).json(event);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(event);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };
