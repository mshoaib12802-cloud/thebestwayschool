const ExamPaper    = require('../models/ExamPaper');
const BankQuestion = require('../models/BankQuestion');

const SECTION_POP = { path: 'sections.questions', model: 'BankQuestion' };
const BASE_POP = [
  { path: 'subject_id',        select: 'name code' },
  { path: 'class_id',          select: 'name section grade_level' },
  { path: 'academic_year_id',  select: 'title' },
  { path: 'created_by',        select: 'name' }
];

// GET /api/exam-papers
const getPapers = async (req, res) => {
  try {
    const { class_id, subject_id, exam_type } = req.query;
    const filter = {};
    if (class_id)   filter.class_id   = class_id;
    if (subject_id) filter.subject_id = subject_id;
    if (exam_type)  filter.exam_type  = exam_type;
    if (req.user.role === 'teacher') filter.created_by = req.user._id;

    const papers = await ExamPaper.find(filter).populate(BASE_POP).sort({ createdAt: -1 });
    res.json(papers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/exam-papers/:id  (with full questions populated)
const getPaper = async (req, res) => {
  try {
    const paper = await ExamPaper.findById(req.params.id)
      .populate(BASE_POP)
      .populate(SECTION_POP);
    if (!paper) return res.status(404).json({ message: 'Not found' });
    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/exam-papers
const createPaper = async (req, res) => {
  try {
    const paper = await ExamPaper.create({ ...req.body, created_by: req.user._id });
    // Increment usage counter for all selected questions
    const qIds = (paper.sections || []).flatMap(s => s.questions);
    if (qIds.length) await BankQuestion.updateMany({ _id: { $in: qIds } }, { $inc: { times_used: 1 } });
    res.status(201).json(paper);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/exam-papers/:id
const updatePaper = async (req, res) => {
  try {
    const paper = await ExamPaper.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(paper);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/exam-papers/:id
const deletePaper = async (req, res) => {
  try {
    await ExamPaper.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPapers, getPaper, createPaper, updatePaper, deletePaper };
