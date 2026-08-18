const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const Attendance = require('../models/Attendance');
const Fine = require('../models/Fine');
const Course = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const DateSheet = require('../models/DateSheet');
const Schedule = require('../models/Schedule');
const ReportCard = require('../models/ReportCard');

const getMyProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id)
      .populate('courses.trainer_id', 'name role')
      .populate('courses.batch_id', 'name shift start_date end_date')
      .populate('school_class_id', 'name grade')
      .populate('academic_year_id', 'label');
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    res.json(student);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMyCourses = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id)
      .populate('courses.trainer_id', 'name role')
      .populate('courses.batch_id', 'name shift start_date end_date');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student.courses);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMyFees = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const transactions = await Transaction.find({
      student_id: req.user.student_id,
      type: 'income',
      category: 'fee_collection'
    }).sort({ date: -1 });

    const course = student.courses[0] || {};
    const netPayable = (course.total_fee || 0) - (course.discount_amount || 0);
    const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      student: {
        name: student.full_name,
        roll_no: student.roll_number,
        course: course.course_name,
        total_fee: course.total_fee || 0,
        discount: course.discount_amount || 0,
        net_payable: netPayable,
        installments: course.installments || []
      },
      summary: { total: netPayable, paid: totalPaid, balance: netPayable - totalPaid },
      history: transactions
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMyResults = async (req, res) => {
  try {
    const results = await Result.find({ student_id: req.user.student_id })
      .populate({
        path: 'exam_id',
        match: { is_published: true },
        select: 'title course_name exam_date total_marks pass_marks description type grade_boundaries batch_id',
        populate: { path: 'batch_id', select: 'name shift' }
      })
      .sort({ createdAt: -1 });
    // Strip results whose exam wasn't published
    res.json(results.filter(r => r.exam_id !== null));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const student = await Student.findById(req.user.student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const attendance = await Attendance.find({
      person_id: student._id,
      person_type: 'Student',
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const daysInMonth = new Date(y, m, 0).getDate();
    const calendar = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const record = attendance.find(a => new Date(a.date).getDate() === day);
      calendar.push({
        day,
        status: record ? record.status : null,
        check_in: record?.check_in_time || null
      });
    }

    const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const absent  = attendance.filter(a => a.status === 'absent').length;
    const leave   = attendance.filter(a => a.status === 'leave').length;

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === y && (today.getMonth() + 1) === m;
    const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
    const percent = daysElapsed > 0 ? Math.round((present / daysElapsed) * 100) : 0;

    res.json({
      student: { name: student.full_name, roll_no: student.roll_number },
      calendar,
      summary: {
        present,
        absent,
        leave,
        total: daysElapsed,
        percent
      }
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMyFines = async (req, res) => {
  try {
    const fines = await Fine.find({ student_id: req.user.student_id })
      .populate('issued_by', 'name')
      .sort({ issued_date: -1 });

    const pending = fines.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0);
    const paid = fines.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);

    res.json({ fines, summary: { pending, paid, total: fines.length } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMyModules = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const results = [];
    for (const enrolled of student.courses) {
      const courseDoc = await Course.findOne({ name: enrolled.course_name });
      if (!courseDoc) continue;

      const modules = await CourseModule.find({ course_id: courseDoc._id })
        .sort({ order: 1 })
        .select('-created_by');

      const completed = modules.filter(m => m.status === 'completed').length;
      const inProgress = modules.filter(m => m.status === 'in_progress').length;
      const upcoming = modules.length - completed - inProgress;

      results.push({
        course_name: enrolled.course_name,
        course_id: courseDoc._id,
        total: modules.length,
        completed,
        in_progress: inProgress,
        upcoming,
        progress_pct: modules.length > 0 ? Math.round((completed / modules.length) * 100) : 0,
        modules
      });
    }

    res.json(results);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getMyDateSheets = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const courseNames = student.courses.map(c => c.course_name);
    const sheets = await DateSheet.find({
      is_published: true,
      course_name: { $in: courseNames },
    }).sort({ createdAt: -1 });

    res.json(sheets);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyTimetable = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const batchIds = student.courses.map(c => c.batch_id).filter(Boolean);
    if (!batchIds.length) return res.json({ schedules: [], batches: [] });

    const schedules = await Schedule.find({ batch_id: { $in: batchIds } })
      .populate({ path: 'batch_id', populate: { path: 'trainer_id', select: 'name' } })
      .sort({ day_of_week: 1, start_time: 1 });

    res.json({ schedules });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const calcGrade = (pct) => {
  if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';  return 'F';
};

const getMyReportCard = async (req, res) => {
  try {
    const { course_name } = req.query;
    const student = await Student.findById(req.user.student_id).select('full_name roll_number courses');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const courseNames = course_name ? [course_name] : student.courses.map(c => c.course_name);
    const cards = [];

    for (const cn of courseNames) {
      const exams = await Exam.find({ course_name: cn, is_published: true }).sort({ exam_date: 1 });
      const examIds = exams.map(e => e._id);
      const results = await Result.find({ student_id: student._id, exam_id: { $in: examIds } });
      const rMap = {};
      results.forEach(r => { rMap[r.exam_id.toString()] = r; });

      const entries = exams.map(exam => {
        const r = rMap[exam._id.toString()];
        const pct = r && !r.is_absent ? Math.round((r.marks_obtained / exam.total_marks) * 100) : null;
        return {
          exam: { _id: exam._id, title: exam.title, type: exam.type, exam_date: exam.exam_date, total_marks: exam.total_marks, pass_marks: exam.pass_marks, weightage_percent: exam.weightage_percent, is_live: exam.is_live },
          result: r ? { marks_obtained: r.marks_obtained, grade: r.grade, is_absent: r.is_absent, is_retake: r.is_retake, pct } : null,
        };
      });

      const withResults = entries.filter(e => e.result && !e.result.is_absent);
      let wSum = 0, wTotal = 0;
      withResults.forEach(({ exam, result }) => {
        const w = exam.weightage_percent || 100;
        wSum += (result.pct || 0) * w;
        wTotal += w;
      });
      const weightedAverage = wTotal > 0 ? Math.round(wSum / wTotal * 10) / 10 : 0;
      cards.push({ course_name: cn, entries, weightedAverage, overallGrade: calcGrade(weightedAverage) });
    }

    res.json({ student, cards });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMySchoolReportCards = async (req, res) => {
  try {
    const cards = await ReportCard.find({ student_id: req.user.student_id })
      .populate('class_id', 'name section grade_level')
      .populate('academic_year_id', 'label')
      .sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getMyProfile, getMyCourses, getMyFees, getMyResults, getMyAttendance, getMyFines, getMyModules, getMyDateSheets, getMyTimetable, getMyReportCard, getMySchoolReportCards };
