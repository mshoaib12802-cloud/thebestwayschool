const Announcement = require('../models/Announcement');
const Student = require('../models/Student');

const getAnnouncements = async (req, res) => {
  try {
    const { audience } = req.query;
    const filter = { is_active: true };
    if (audience) filter.audience = audience;
    const announcements = await Announcement.find(filter)
      .populate('created_by', 'name role')
      .populate('class_ids', 'grade section')
      .sort({ is_pinned: -1, createdAt: -1 });
    res.json(announcements);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const createAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.create({ ...req.body, created_by: req.user._id });
    await ann.populate('created_by', 'name role');
    res.status(201).json(ann);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('created_by', 'name role');
    res.json(ann);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// Student sees announcements for their audience + class
const getStudentAnnouncements = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    const now = new Date();
    const anns = await Announcement.find({
      is_active: true,
      $or: [{ expires_at: null }, { expires_at: { $gte: now } }],
      $or: [
        { audience: { $in: ['all', 'students'] } },
        { class_ids: student?.school_class_id },
      ],
    }).populate('created_by', 'name').sort({ is_pinned: -1, createdAt: -1 });
    res.json(anns);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// Parent sees announcements visible to parents
const getParentAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const anns = await Announcement.find({
      is_active: true,
      $or: [{ expires_at: null }, { expires_at: { $gte: now } }],
      audience: { $in: ['all', 'parents'] },
    }).populate('created_by', 'name').sort({ is_pinned: -1, createdAt: -1 });
    res.json(anns);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

// Teacher sees all + can create
const getTeacherAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const anns = await Announcement.find({
      is_active: true,
      $or: [{ expires_at: null }, { expires_at: { $gte: now } }],
      audience: { $in: ['all', 'teachers'] },
    }).populate('created_by', 'name').sort({ is_pinned: -1, createdAt: -1 });
    res.json(anns);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = {
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getStudentAnnouncements, getParentAnnouncements, getTeacherAnnouncements,
};
