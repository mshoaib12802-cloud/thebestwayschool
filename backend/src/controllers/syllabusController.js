const Syllabus = require('../models/Syllabus');
const Subject  = require('../models/Subject');

const POP = [
  { path: 'subject_id', select: 'name code' },
  { path: 'class_id',   select: 'name section' },
  { path: 'academic_year_id', select: 'label' }
];

// GET /api/syllabus?subject_id=&class_id=&academic_year_id=
const getSyllabus = async (req, res) => {
  try {
    const { subject_id, class_id, academic_year_id } = req.query;
    const syl = await Syllabus.findOne({ subject_id, class_id, academic_year_id }).populate(POP);
    res.json(syl || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/syllabus/all?class_id=&academic_year_id=
const getAllSyllabi = async (req, res) => {
  try {
    const filter = {};
    if (req.query.class_id)        filter.class_id = req.query.class_id;
    if (req.query.academic_year_id) filter.academic_year_id = req.query.academic_year_id;
    const list = await Syllabus.find(filter).populate(POP).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/syllabus  – upsert whole syllabus
const upsertSyllabus = async (req, res) => {
  try {
    const { subject_id, class_id, academic_year_id, title, chapters } = req.body;
    let syl = await Syllabus.findOne({ subject_id, class_id, academic_year_id });
    if (syl) {
      if (title !== undefined) syl.title = title;
      if (chapters !== undefined) syl.chapters = chapters;
      await syl.save();
    } else {
      syl = await Syllabus.create({
        subject_id, class_id, academic_year_id,
        title: title || '', chapters: chapters || [],
        created_by: req.user._id
      });
    }
    res.json(await syl.populate(POP));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/syllabus/:id/topic – toggle topic completion
const toggleTopic = async (req, res) => {
  try {
    const { chapter_id, topic_id, is_completed } = req.body;
    const syl = await Syllabus.findById(req.params.id);
    if (!syl) return res.status(404).json({ message: 'Not found' });

    const chapter = syl.chapters.id(chapter_id);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
    const topic = chapter.topics.id(topic_id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });

    topic.is_completed = is_completed;
    topic.completion_date = is_completed ? new Date() : null;
    await syl.save();
    res.json(syl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/syllabus/by-teacher  – teacher sees their subjects' syllabi
const getByTeacher = async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher_id: req.user._id, is_active: true });
    const ids = subjects.map(s => s._id);
    const list = await Syllabus.find({ subject_id: { $in: ids } }).populate(POP).sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSyllabus, getAllSyllabi, upsertSyllabus, toggleTopic, getByTeacher };
