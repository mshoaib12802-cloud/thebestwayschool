const DiaryEntry = require('../models/DiaryEntry');
const Student    = require('../models/Student');
const User       = require('../models/User');

const POP = [
  { path: 'class_id',         select: 'name section grade_level' },
  { path: 'academic_year_id', select: 'label' },
  { path: 'created_by',       select: 'name' },
];

const dayRange = (dateStr) => {
  const d = new Date(dateStr);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ── GET (admin/staff) ─────────────────────────────────────────────────────────
const getDiaryEntries = async (req, res) => {
  try {
    const filter = {};
    if (req.query.class_id)         filter.class_id         = req.query.class_id;
    if (req.query.academic_year_id) filter.academic_year_id = req.query.academic_year_id;
    if (req.query.date) {
      const { start, end } = dayRange(req.query.date);
      filter.date = { $gte: start, $lte: end };
    } else {
      const from = req.query.from ? new Date(req.query.from) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
      const to   = req.query.to   ? new Date(req.query.to)   : new Date();
      filter.date = { $gte: from, $lte: to };
    }
    const entries = await DiaryEntry.find(filter).populate(POP).sort({ date: -1 }).limit(200);
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── CREATE / UPSERT ───────────────────────────────────────────────────────────
const createDiaryEntry = async (req, res) => {
  try {
    const { class_id, academic_year_id, date, items, general_note, is_published } = req.body;
    const { start, end } = dayRange(date);

    let entry = await DiaryEntry.findOne({ class_id, date: { $gte: start, $lte: end } });
    if (entry) {
      entry.academic_year_id = academic_year_id;
      entry.items            = items || [];
      entry.general_note     = general_note || '';
      if (is_published !== undefined) entry.is_published = is_published;
      await entry.save();
    } else {
      entry = await DiaryEntry.create({
        class_id, academic_year_id,
        date: new Date(date),
        items:        items        || [],
        general_note: general_note || '',
        is_published: is_published !== undefined ? is_published : true,
        created_by:   req.user._id,
      });
    }
    res.status(201).json(await DiaryEntry.findById(entry._id).populate(POP));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
const updateDiaryEntry = async (req, res) => {
  try {
    const entry = await DiaryEntry.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate(POP);
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
const deleteDiaryEntry = async (req, res) => {
  try {
    await DiaryEntry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── STUDENT PORTAL ────────────────────────────────────────────────────────────
const getStudentDiary = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id).select('school_class_id');
    if (!student?.school_class_id) return res.json([]);
    const from = new Date(); from.setDate(from.getDate() - 60); from.setHours(0,0,0,0);
    const entries = await DiaryEntry.find({
      class_id:     student.school_class_id,
      is_published: true,
      date:         { $gte: from },
    }).populate(POP).sort({ date: -1 }).limit(60);
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── PARENT PORTAL ─────────────────────────────────────────────────────────────
const getChildDiary = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id);
    const isChild = parent?.student_ids?.map(id => id.toString()).includes(req.params.studentId);
    if (!isChild) return res.status(403).json({ message: 'Access denied' });

    const student = await Student.findById(req.params.studentId).select('school_class_id');
    if (!student?.school_class_id) return res.json([]);
    const from = new Date(); from.setDate(from.getDate() - 60); from.setHours(0,0,0,0);
    const entries = await DiaryEntry.find({
      class_id:     student.school_class_id,
      is_published: true,
      date:         { $gte: from },
    }).populate(POP).sort({ date: -1 }).limit(60);
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getDiaryEntries, createDiaryEntry, updateDiaryEntry, deleteDiaryEntry, getStudentDiary, getChildDiary };
