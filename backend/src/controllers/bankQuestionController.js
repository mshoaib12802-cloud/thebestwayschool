const BankQuestion = require('../models/BankQuestion');

// GET /api/bank-questions
const getQuestions = async (req, res) => {
  try {
    const { subject_id, class_id, type, difficulty, chapter_title, search } = req.query;
    const filter = {};
    if (subject_id)    filter.subject_id = subject_id;
    if (class_id)      filter.class_id   = class_id;
    if (type)          filter.type        = type;
    if (difficulty)    filter.difficulty  = difficulty;
    if (chapter_title) filter.chapter_title = { $regex: chapter_title, $options: 'i' };
    if (search)        filter.text          = { $regex: search,         $options: 'i' };

    const qs = await BankQuestion.find(filter)
      .populate('created_by', 'name')
      .sort({ createdAt: -1 })
      .limit(300);

    res.json(qs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/bank-questions
const addQuestion = async (req, res) => {
  try {
    const q = await BankQuestion.create({ ...req.body, created_by: req.user._id });
    res.status(201).json(q);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/bank-questions/bulk
const bulkAdd = async (req, res) => {
  try {
    const { questions } = req.body;
    const docs = questions.map(q => ({ ...q, created_by: req.user._id }));
    const inserted = await BankQuestion.insertMany(docs);
    res.status(201).json(inserted);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/bank-questions/:id
const updateQuestion = async (req, res) => {
  try {
    const q = await BankQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(q);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/bank-questions/:id
const deleteQuestion = async (req, res) => {
  try {
    await BankQuestion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getQuestions, addQuestion, bulkAdd, updateQuestion, deleteQuestion };
