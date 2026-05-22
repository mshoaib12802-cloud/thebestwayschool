const Exam        = require('../models/Exam');
const Question    = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const Result      = require('../models/Result');
const Student     = require('../models/Student');
const { notifyStudent } = require('../utils/notify');

const calcGrade = (obtained, total, boundaries = {}) => {
  if (total === 0) return 'F';
  const pct = (obtained / total) * 100;
  const b = { a_plus: 90, a: 80, b: 70, c: 60, d: 50, ...boundaries };
  if (pct >= b.a_plus) return 'A+';
  if (pct >= b.a)      return 'A';
  if (pct >= b.b)      return 'B';
  if (pct >= b.c)      return 'C';
  if (pct >= b.d)      return 'D';
  return 'F';
};

/* ── Admin / Teacher ──────────────────────────────────────── */

const getLiveExams = async (req, res) => {
  try {
    const exams = await Exam.find({ is_live: true }).sort({ createdAt: -1 }).populate('batch_id', 'name');
    const examIds = exams.map(e => e._id);

    const [qCounts, aCounts] = await Promise.all([
      Question.aggregate([{ $match: { exam_id: { $in: examIds } } }, { $group: { _id: '$exam_id', count: { $sum: 1 } } }]),
      ExamAttempt.aggregate([{ $match: { exam_id: { $in: examIds }, status: 'submitted' } }, { $group: { _id: '$exam_id', count: { $sum: 1 } } }]),
    ]);
    const qMap = {}, aMap = {};
    qCounts.forEach(r => { qMap[r._id.toString()] = r.count; });
    aCounts.forEach(r => { aMap[r._id.toString()] = r.count; });

    res.json(exams.map(e => ({
      ...e.toObject(),
      question_count: qMap[e._id.toString()] || 0,
      attempt_count:  aMap[e._id.toString()] || 0,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createLiveExam = async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, is_live: true, created_by: req.user._id });
    res.status(201).json(exam);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const EXAM_ALLOWED_FIELDS = ['title', 'course_name', 'batch_id', 'description', 'duration_minutes',
  'total_marks', 'pass_marks', 'live_start', 'live_end', 'shuffle_questions',
  'allow_retake', 'negative_marks_per_wrong', 'grade_boundaries'];

const updateLiveExam = async (req, res) => {
  try {
    const update = {};
    EXAM_ALLOWED_FIELDS.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const exam = await Exam.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const deleteLiveExam = async (req, res) => {
  try {
    await Promise.all([
      Exam.findByIdAndDelete(req.params.id),
      Question.deleteMany({ exam_id: req.params.id }),
      ExamAttempt.deleteMany({ exam_id: req.params.id }),
      Result.deleteMany({ exam_id: req.params.id }),
    ]);
    res.json({ message: 'Live exam deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const publishToggleLive = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    exam.is_published = !exam.is_published;
    await exam.save();
    res.json(exam);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Questions ────────────────────────────────────────────── */

const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ exam_id: req.params.id }).sort({ order: 1, createdAt: 1 });
    res.json(questions);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addQuestion = async (req, res) => {
  try {
    const count = await Question.countDocuments({ exam_id: req.params.id });
    const q = await Question.create({ ...req.body, exam_id: req.params.id, order: count });
    res.status(201).json(q);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const Q_ALLOWED = ['text', 'options', 'correct_index', 'marks', 'order'];

const updateQuestion = async (req, res) => {
  try {
    const update = {};
    Q_ALLOWED.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const q = await Question.findByIdAndUpdate(req.params.qid, update, { new: true, runValidators: true });
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json(q);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const deleteQuestion = async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.qid);
    res.json({ message: 'Question deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const importQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'No questions provided' });
    }
    const existingCount = await Question.countDocuments({ exam_id: req.params.id });
    const toInsert = questions.map((q, i) => ({
      exam_id: req.params.id,
      text: String(q.text).trim(),
      options: q.options.map(o => String(o).trim()),
      correct_index: Number(q.correct_index),
      marks: Number(q.marks) || 1,
      order: existingCount + i,
    }));
    const inserted = await Question.insertMany(toInsert);
    res.status(201).json({ count: inserted.length, questions: inserted });
  } catch (err) { res.status(400).json({ message: err.message }); }
};

/* ── Attempts / Results ───────────────────────────────────── */

const getLiveExamAttempts = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const attempts = await ExamAttempt.find({ exam_id: req.params.id })
      .populate('student_id', 'full_name roll_number')
      .sort({ score: -1 });
    const questions = await Question.find({ exam_id: req.params.id });
    res.json({ exam, attempts, question_count: questions.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Student Portal ───────────────────────────────────────── */

const getStudentLiveExams = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const courseNames = (student.courses || []).map(c => c.course_name);
    const now = new Date();

    const exams = await Exam.find({
      is_live: true,
      is_published: true,
      course_name: { $in: courseNames },
      $or: [
        { live_end: null },
        { live_end: { $gte: now } },
      ],
    }).sort({ live_start: 1 });

    const examIds = exams.map(e => e._id);
    const attempts = await ExamAttempt.find({ student_id: student._id, exam_id: { $in: examIds } });
    const attemptMap = {};
    attempts.forEach(a => { attemptMap[a.exam_id.toString()] = a; });

    const qCounts = await Question.aggregate([
      { $match: { exam_id: { $in: examIds } } },
      { $group: { _id: '$exam_id', count: { $sum: 1 } } }
    ]);
    const qMap = {};
    qCounts.forEach(r => { qMap[r._id.toString()] = r.count; });

    res.json(exams.map(e => ({
      ...e.toObject(),
      question_count: qMap[e._id.toString()] || 0,
      attempt: attemptMap[e._id.toString()] || null,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const startLiveExam = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const exam = await Exam.findOne({ _id: req.params.id, is_live: true, is_published: true });
    if (!exam) return res.status(404).json({ message: 'Exam not found or not published' });

    const now = new Date();
    if (exam.live_start && now < exam.live_start) return res.status(400).json({ message: 'Exam has not started yet' });
    if (exam.live_end && now > exam.live_end) return res.status(400).json({ message: 'Exam window has closed' });

    const existing = await ExamAttempt.findOne({ exam_id: exam._id, student_id: student._id });
    if (existing && existing.status === 'submitted' && !exam.allow_retake) {
      return res.status(400).json({ message: 'You have already submitted this exam' });
    }
    if (existing && existing.status === 'in_progress') {
      return res.json({ attempt: existing, already_started: true });
    }

    const questions = await Question.find({ exam_id: exam._id });
    if (questions.length === 0) return res.status(400).json({ message: 'This exam has no questions yet' });

    const attempt = await ExamAttempt.create({
      exam_id: exam._id,
      student_id: student._id,
      started_at: now,
      status: 'in_progress',
    });
    res.status(201).json({ attempt, already_started: false });
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const getLiveExamForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const exam = await Exam.findOne({ _id: req.params.id, is_live: true, is_published: true });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const attempt = await ExamAttempt.findOne({ exam_id: exam._id, student_id: student._id });
    if (!attempt) return res.status(400).json({ message: 'Start the exam first' });
    if (attempt.status === 'submitted') return res.status(400).json({ message: 'Exam already submitted', submitted: true });

    const now = new Date();
    if (exam.live_end && now > exam.live_end) {
      attempt.status = 'timed_out';
      await attempt.save();
      return res.status(400).json({ message: 'Exam window has closed', timed_out: true });
    }

    let questions = await Question.find({ exam_id: exam._id }).sort({ order: 1, createdAt: 1 })
      .select('-correct_index');

    if (exam.shuffle_questions) {
      // Deterministic shuffle per student (same order on resume)
      const seed = student._id.toString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      questions = [...questions];
      for (let i = questions.length - 1; i > 0; i--) {
        const j = (seed * (i + 1) + i * 31) % (i + 1);
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    const elapsed = Math.floor((now - attempt.started_at) / 1000);
    const remaining = exam.duration_minutes * 60 - elapsed;

    res.json({ exam, questions, attempt, remaining_seconds: Math.max(0, remaining) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const submitLiveExam = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const exam = await Exam.findOne({ _id: req.params.id, is_live: true });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const attempt = await ExamAttempt.findOne({ exam_id: exam._id, student_id: student._id, status: 'in_progress' });
    if (!attempt) return res.status(400).json({ message: 'No active attempt found' });

    const { answers } = req.body; // [{question_id, selected_index}]
    const questions = await Question.find({ exam_id: exam._id });
    const qMap = {};
    questions.forEach(q => { qMap[q._id.toString()] = q; });

    let score = 0;
    const total_marks = questions.reduce((s, q) => s + q.marks, 0);
    const processedAnswers = [];

    (answers || []).forEach(a => {
      const q = qMap[a.question_id];
      if (!q) return;
      const selected = typeof a.selected_index === 'number' ? a.selected_index : -1;
      if (selected !== -1) {
        if (selected === q.correct_index) {
          score += q.marks;
        } else if (exam.negative_marks_per_wrong > 0) {
          score -= exam.negative_marks_per_wrong;
        }
      }
      processedAnswers.push({
        question_id: q._id,
        selected_index: selected,
        time_spent_seconds: typeof a.time_spent_seconds === 'number' ? a.time_spent_seconds : 0,
        flagged: !!a.flagged,
      });
    });
    score = Math.max(0, Math.round(score * 10) / 10);

    const grade = calcGrade(score, total_marks, exam.grade_boundaries);
    const submitted_at = new Date();
    const time_taken = Math.floor((submitted_at - attempt.started_at) / 1000);

    attempt.answers = processedAnswers;
    attempt.score = score;
    attempt.total_marks = total_marks;
    attempt.grade = grade;
    attempt.submitted_at = submitted_at;
    attempt.time_taken_seconds = time_taken;
    attempt.status = 'submitted';
    await attempt.save();

    // Also write into Result so it shows in standard results views
    await Result.findOneAndUpdate(
      { exam_id: exam._id, student_id: student._id },
      { marks_obtained: score, remarks: `Live exam — auto-graded`, grade },
      { new: true, upsert: true }
    );

    notifyStudent(student._id,
      'Live Exam Submitted',
      `You scored ${score}/${total_marks} (${grade}) in "${exam.title}"`,
      'result', '/student-portal/live-exams'
    );

    res.json({ score, total_marks, grade, time_taken_seconds: time_taken, attempt_id: attempt._id });
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const getStudentLiveResults = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const attempts = await ExamAttempt.find({ student_id: student._id, status: 'submitted' })
      .populate('exam_id', 'title course_name duration_minutes total_marks grade_boundaries live_start live_end')
      .sort({ submitted_at: -1 });
    res.json(attempts);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getAttemptReview = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const attempt = await ExamAttempt.findOne({ _id: req.params.id, student_id: student._id, status: 'submitted' });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    const exam = await Exam.findById(attempt.exam_id);
    const questions = await Question.find({ exam_id: attempt.exam_id }).sort({ order: 1, createdAt: 1 });

    const answerMap = {};
    attempt.answers.forEach(a => { answerMap[a.question_id.toString()] = a.selected_index; });

    const reviewed = questions.map(q => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      correct_index: q.correct_index,
      selected_index: answerMap[q._id.toString()] ?? -1,
      marks: q.marks,
      is_correct: answerMap[q._id.toString()] === q.correct_index,
    }));

    res.json({ exam, attempt, questions: reviewed });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getLiveExams, createLiveExam, updateLiveExam, deleteLiveExam, publishToggleLive,
  getQuestions, addQuestion, updateQuestion, deleteQuestion, importQuestions,
  getLiveExamAttempts,
  getStudentLiveExams, startLiveExam, getLiveExamForStudent, submitLiveExam,
  getStudentLiveResults, getAttemptReview,
};
