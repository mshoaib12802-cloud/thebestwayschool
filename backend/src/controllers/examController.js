const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Student = require('../models/Student');
const { notifyStudent } = require('../utils/notify');

const calcGrade = (obtained, total, boundaries = {}) => {
  const pct = (obtained / total) * 100;
  const b = { a_plus: 90, a: 80, b: 70, c: 60, d: 50, ...boundaries };
  if (pct >= b.a_plus) return 'A+';
  if (pct >= b.a)      return 'A';
  if (pct >= b.b)      return 'B';
  if (pct >= b.c)      return 'C';
  if (pct >= b.d)      return 'D';
  return 'F';
};

const createExam = async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, created_by: req.user._id });
    res.status(201).json(exam);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ exam_date: -1 }).populate('batch_id', 'name');
    const examIds = exams.map(e => e._id);
    const counts = await Result.aggregate([
      { $match: { exam_id: { $in: examIds } } },
      { $group: { _id: '$exam_id', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(r => { countMap[r._id.toString()] = r.count; });
    res.json(exams.map(e => ({ ...e.toObject(), result_count: countMap[e._id.toString()] || 0 })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const EXAM_ALLOWED_FIELDS = ['title', 'course_name', 'batch_id', 'description', 'exam_date',
  'duration_minutes', 'total_marks', 'pass_marks', 'weightage_percent',
  'type', 'is_live', 'grade_boundaries'];

const updateExam = async (req, res) => {
  try {
    const update = {};
    EXAM_ALLOWED_FIELDS.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const exam = await Exam.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteExam = async (req, res) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    await Result.deleteMany({ exam_id: req.params.id });
    res.json({ message: 'Exam deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const publishToggle = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    exam.is_published = !exam.is_published;
    await exam.save();

    // Notify all students who have results when publishing
    if (exam.is_published) {
      const results = await Result.find({ exam_id: exam._id });
      results.forEach(r => {
        notifyStudent(r.student_id,
          'Results Published',
          `Results for "${exam.title}" are now available. Check your portal!`,
          'result', '/student-portal/results'
        );
      });
    }
    res.json(exam);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const results = await Result.find({ exam_id: req.params.id })
      .populate('student_id', 'full_name roll_number');
    const students = await Student.find({ isActive: true, 'courses.course_name': exam.course_name })
      .select('full_name roll_number courses')
      .populate('courses.batch_id', 'name shift');
    // Attach the relevant batch (for this course) to each student object
    const studentsWithBatch = students.map(s => {
      const obj = s.toObject();
      const c = obj.courses?.find(c => c.course_name === exam.course_name);
      obj.batch = c?.batch_id || null;
      return obj;
    });
    res.json({ exam, results, students: studentsWithBatch });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const saveResult = async (req, res) => {
  try {
    const { exam_id, student_id, marks_obtained, remarks, is_retake, is_absent } = req.body;
    const exam = await Exam.findById(exam_id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const grade = is_absent ? 'AB' : calcGrade(Number(marks_obtained), exam.total_marks, exam.grade_boundaries);
    const result = await Result.findOneAndUpdate(
      { exam_id, student_id },
      { marks_obtained: is_absent ? 0 : Number(marks_obtained), remarks: remarks || '', grade, is_retake: !!is_retake, is_absent: !!is_absent },
      { new: true, upsert: true }
    );
    if (!exam.is_published) {
      notifyStudent(student_id,
        'Exam Result Recorded',
        `Your marks for "${exam.title}" have been recorded. Results will be visible once published.`,
        'result', '/student-portal/results'
      );
    }
    res.json(result);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const bulkSaveResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const { results } = req.body; // [{student_id, marks_obtained, remarks}]
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ message: 'No results provided' });
    }

    const saved = [];
    for (const r of results) {
      if (r.student_id && (r.is_absent || (r.marks_obtained !== undefined && r.marks_obtained !== ''))) {
        const grade = r.is_absent ? 'AB' : calcGrade(Number(r.marks_obtained), exam.total_marks, exam.grade_boundaries);
        const result = await Result.findOneAndUpdate(
          { exam_id: exam._id, student_id: r.student_id },
          { marks_obtained: r.is_absent ? 0 : Number(r.marks_obtained), remarks: r.remarks || '', grade, is_absent: !!r.is_absent },
          { new: true, upsert: true }
        );
        saved.push(result);
      }
    }
    res.json({ saved: saved.length, message: `${saved.length} results saved` });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getExamAnalytics = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const results = await Result.find({ exam_id: req.params.id })
      .populate({ path: 'student_id', select: 'full_name roll_number courses', populate: { path: 'courses.batch_id', select: 'name shift' } });
    const studentCount = await Student.countDocuments({ isActive: true, 'courses.course_name': exam.course_name });

    if (results.length === 0) {
      return res.json({ exam, studentCount, resultCount: 0, average: 0, highest: 0, lowest: 0, passCount: 0, passRate: 0, gradeBreakdown: {}, ranked: [] });
    }

    const marks = results.map(r => r.marks_obtained);
    const average = Math.round(marks.reduce((a, b) => a + b, 0) / marks.length * 10) / 10;
    const highest = Math.max(...marks);
    const lowest  = Math.min(...marks);
    const passCount = results.filter(r => r.grade !== 'F').length;
    const passRate = Math.round((passCount / results.length) * 100);

    const gradeBreakdown = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    results.forEach(r => { if (gradeBreakdown[r.grade] !== undefined) gradeBreakdown[r.grade]++; });

    const ranked = [...results]
      .sort((a, b) => b.marks_obtained - a.marks_obtained)
      .map((r, i) => {
        const batchCourse = r.student_id?.courses?.find(c => c.course_name === exam.course_name);
        return {
          rank: i + 1,
          student_name: r.student_id?.full_name || '—',
          roll_number: r.student_id?.roll_number || '—',
          batch_name: batchCourse?.batch_id?.name || null,
          batch_shift: batchCourse?.batch_id?.shift || null,
          marks_obtained: r.marks_obtained,
          grade: r.grade,
          is_retake: r.is_retake,
          remarks: r.remarks,
        };
      });

    res.json({ exam, studentCount, resultCount: results.length, average, highest, lowest, passCount, passRate, gradeBreakdown, ranked });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getStudentResults = async (req, res) => {
  try {
    const results = await Result.find({ student_id: req.params.student_id })
      .populate('exam_id', 'title course_name exam_date total_marks pass_marks description type')
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getStudentReportCard = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { course_name } = req.query;
    if (!course_name) return res.status(400).json({ message: 'course_name query required' });

    const student = await Student.findById(student_id).select('full_name roll_number courses');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const exams = await Exam.find({ course_name, is_published: true }).sort({ exam_date: 1 });
    const examIds = exams.map(e => e._id);
    const results = await Result.find({ student_id, exam_id: { $in: examIds } });
    const resultMap = {};
    results.forEach(r => { resultMap[r.exam_id.toString()] = r; });

    const entries = exams.map(exam => {
      const r = resultMap[exam._id.toString()];
      const pct = r && !r.is_absent ? Math.round((r.marks_obtained / exam.total_marks) * 100) : null;
      return {
        exam: { _id: exam._id, title: exam.title, type: exam.type, exam_date: exam.exam_date, total_marks: exam.total_marks, pass_marks: exam.pass_marks, weightage_percent: exam.weightage_percent, is_live: exam.is_live },
        result: r ? { marks_obtained: r.marks_obtained, grade: r.grade, is_absent: r.is_absent, is_retake: r.is_retake, pct } : null,
      };
    });

    // Weighted GPA
    const withResults = entries.filter(e => e.result && !e.result.is_absent);
    let wSum = 0, wTotal = 0;
    withResults.forEach(({ exam, result }) => {
      const w = exam.weightage_percent || 100;
      wSum += (result.pct || 0) * w;
      wTotal += w;
    });
    const weightedAverage = wTotal > 0 ? Math.round(wSum / wTotal * 10) / 10 : 0;
    const overallGrade = calcGrade(weightedAverage, 100, {});

    res.json({ student, course_name, entries, weightedAverage, overallGrade });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getExamBatchComparison = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const results = await Result.find({ exam_id: exam._id })
      .populate({ path: 'student_id', select: 'full_name roll_number courses', populate: { path: 'courses.batch_id', select: 'name shift' } });

    const batchMap = {};
    results.forEach(r => {
      const course = r.student_id?.courses?.find(c => c.course_name === exam.course_name);
      const key = course?.batch_id?.name || 'No Batch';
      if (!batchMap[key]) batchMap[key] = { batch_name: key, results: [] };
      batchMap[key].results.push({ marks: r.marks_obtained, grade: r.grade, is_absent: r.is_absent, name: r.student_id?.full_name, roll: r.student_id?.roll_number });
    });

    const batches = Object.values(batchMap).map(b => {
      const valid = b.results.filter(r => !r.is_absent);
      const marks = valid.map(r => r.marks);
      const avg = marks.length ? Math.round(marks.reduce((a, v) => a + v, 0) / marks.length * 10) / 10 : 0;
      const highest = marks.length ? Math.max(...marks) : 0;
      const lowest  = marks.length ? Math.min(...marks) : 0;
      const passCount = valid.filter(r => r.grade !== 'F' && r.grade !== 'AB').length;
      const passRate  = valid.length ? Math.round(passCount / valid.length * 100) : 0;
      const grades = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0, AB: 0 };
      b.results.forEach(r => { if (grades[r.grade] !== undefined) grades[r.grade]++; });
      return { batch_name: b.batch_name, count: b.results.length, appeared: valid.length, avg, highest, lowest, passCount, passRate, grades };
    });

    res.json({ exam, batches });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  createExam, getExams, updateExam, deleteExam,
  publishToggle,
  getExamResults, saveResult, bulkSaveResults,
  getExamAnalytics,
  getStudentResults,
  getStudentReportCard,
  getExamBatchComparison,
};
