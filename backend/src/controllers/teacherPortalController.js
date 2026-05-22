const Student = require('../models/Student');
const User = require('../models/User');
const { notifyStudent } = require('../utils/notify');
const Course = require('../models/Course');
const CourseModule = require('../models/CourseModule');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');
const Schedule = require('../models/Schedule');

const calcGrade = (obtained, total, boundaries = {}) => {
  if (!total || total === 0) return 'F';
  const pct = (obtained / total) * 100;
  const b = { a_plus: 90, a: 80, b: 70, c: 60, d: 50, ...boundaries };
  if (pct >= b.a_plus) return 'A+';
  if (pct >= b.a)      return 'A';
  if (pct >= b.b)      return 'B';
  if (pct >= b.c)      return 'C';
  if (pct >= b.d)      return 'D';
  return 'F';
};

// Helper: get Course docs taught by this teacher
const getMyCourseDocs = async (teacherId) => {
  const students = await Student.find({ 'courses.trainer_id': teacherId, isActive: true }).select('courses');
  const nameSet = new Set();
  students.forEach(s => {
    s.courses.forEach(c => {
      if (c.trainer_id?.toString() === teacherId.toString()) nameSet.add(c.course_name);
    });
  });
  return Course.find({ name: { $in: [...nameSet] } });
};

const getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const myCourses = await getMyCourseDocs(teacherId);
    const courseIds = myCourses.map(c => c._id);

    const [studentCount, modAgg, recentExams, myStudentDocs, commissionAgg] = await Promise.all([
      Student.countDocuments({ 'courses.trainer_id': teacherId, isActive: true }),
      CourseModule.aggregate([
        { $match: { course_id: { $in: courseIds } } },
        { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } } } }
      ]),
      Exam.find({ created_by: teacherId }).sort({ exam_date: -1 }).limit(5),
      Student.find({ 'courses.trainer_id': teacherId, isActive: true }).select('_id'),
      require('../models/Transaction').aggregate([
        { $match: { category: 'trainer_commission', staff_id: teacherId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    const m = modAgg[0] || { total: 0, completed: 0, in_progress: 0 };
    const studentIds = myStudentDocs.map(s => s._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayPresent = await Attendance.countDocuments({
      person_id: { $in: studentIds },
      person_type: 'Student',
      date: { $gte: today, $lte: todayEnd },
      status: 'present'
    });

    // Batches assigned to this teacher
    const myBatches = await Batch.find({ trainer_id: teacherId, is_active: true })
      .select('name course_name shift start_date end_date capacity');

    // Per-course module progress for dashboard cards
    const courseProgress = await Promise.all(myCourses.map(async (c) => {
      const mods = await CourseModule.find({ course_id: c._id });
      const total = mods.length;
      const completed = mods.filter(m => m.status === 'completed').length;
      const in_progress = mods.filter(m => m.status === 'in_progress').length;
      return {
        course_id: c._id,
        course_name: c.name,
        total,
        completed,
        in_progress,
        upcoming: total - completed - in_progress,
        progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
        batches: myBatches.filter(b => b.course_name === c.name),
      };
    }));

    res.json({
      studentCount,
      courseCount: myCourses.length,
      todayPresent,
      totalEarnings: commissionAgg[0]?.total || 0,
      modules: {
        total: m.total,
        completed: m.completed,
        in_progress: m.in_progress,
        upcoming: m.total - m.completed - m.in_progress
      },
      recentExams,
      courseProgress
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const myCourses = await getMyCourseDocs(teacherId);
    const myBatches = await Batch.find({ trainer_id: teacherId })
      .select('name course_name shift start_date end_date capacity is_active');
    const result = await Promise.all(myCourses.map(async (course) => {
      const modules = await CourseModule.find({ course_id: course._id }).sort({ order: 1 });
      const total = modules.length;
      const completed = modules.filter(m => m.status === 'completed').length;
      const in_progress = modules.filter(m => m.status === 'in_progress').length;
      return {
        _id: course._id,
        name: course.name,
        duration: course.duration,
        modules,
        batches: myBatches.filter(b => b.course_name === course.name),
        stats: {
          total,
          completed,
          in_progress,
          upcoming: total - completed - in_progress,
          progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0
        }
      };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTeacherStudents = async (req, res) => {
  try {
    const students = await Student.find({ 'courses.trainer_id': req.user._id, isActive: true })
      .select('full_name roll_number courses phone email')
      .populate('courses.batch_id', 'name shift start_date end_date');
    res.json(students);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTeacherAttendance = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { month, year } = req.query;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const myStudents = await Student.find({ 'courses.trainer_id': teacherId, isActive: true })
      .select('_id full_name roll_number courses');
    const studentIds = myStudents.map(s => s._id);

    const records = await Attendance.find({
      person_id: { $in: studentIds },
      person_type: 'Student',
      date: { $gte: start, $lte: end }
    }).sort({ date: -1, person_id: 1 });

    res.json({ students: myStudents, records });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markTeacherAttendance = async (req, res) => {
  try {
    const { person_id, date, status } = req.body;

    // Verify this student belongs to the requesting teacher
    const isMyStudent = await Student.exists({ _id: person_id, 'courses.trainer_id': req.user._id, isActive: true });
    if (!isMyStudent) return res.status(403).json({ message: 'This student is not in your class.' });

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const record = await Attendance.findOneAndUpdate(
      { person_id, person_type: 'Student', date: { $gte: day, $lte: dayEnd } },
      { status, date: day },
      { new: true, upsert: true }
    );
    // Only notify for absent/late so students aren't spammed daily
    if (status === 'absent' || status === 'late') {
      const statusLabel = status === 'absent' ? 'Absent' : 'Late';
      notifyStudent(person_id,
        `Attendance Marked: ${statusLabel}`,
        `Your attendance for ${day.toLocaleDateString('en-PK')} has been marked as ${statusLabel}.`,
        'attendance', '/student-portal/attendance'
      );
    }
    res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ created_by: req.user._id }).sort({ exam_date: -1 });
    const examIds = exams.map(e => e._id);
    const counts = await Result.aggregate([
      { $match: { exam_id: { $in: examIds } } },
      { $group: { _id: '$exam_id', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(r => { countMap[r._id.toString()] = r.count; });
    res.json(exams.map(e => ({ ...e.toObject(), result_count: countMap[e._id.toString()] || 0 })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createTeacherExam = async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, created_by: req.user._id });
    res.status(201).json(exam);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const getTeacherExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const results = await Result.find({ exam_id: req.params.id })
      .populate('student_id', 'full_name roll_number');
    const students = await Student.find({
      isActive: true,
      'courses.trainer_id': req.user._id,
      'courses.course_name': exam.course_name
    }).select('full_name roll_number');
    res.json({ exam, results, students });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const saveTeacherResult = async (req, res) => {
  try {
    const { exam_id, student_id, marks_obtained, remarks } = req.body;
    const exam = await Exam.findOne({ _id: exam_id, created_by: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found or not yours' });
    const grade = calcGrade(Number(marks_obtained), exam.total_marks, exam.grade_boundaries);
    const result = await Result.findOneAndUpdate(
      { exam_id, student_id },
      { marks_obtained: Number(marks_obtained), remarks: remarks || '', grade },
      { new: true, upsert: true }
    );
    notifyStudent(student_id,
      'Exam Result Recorded',
      `Your marks for "${exam.title}" have been entered. Results will appear once published by your teacher.`,
      'result', '/student-portal/results'
    );
    res.json(result);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const deleteTeacherExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, created_by: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found or not yours' });
    await Exam.findByIdAndDelete(req.params.id);
    await Result.deleteMany({ exam_id: req.params.id });
    res.json({ message: 'Exam deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTeacherProfile = async (req, res) => {
  try {
    const teacher = await User.findById(req.user._id).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Profile not found' });

    const myCourses = await getMyCourseDocs(req.user._id);
    const courseIds = myCourses.map(c => c._id);

    const [studentCount, modAgg, examCount, totalCommission] = await Promise.all([
      Student.countDocuments({ 'courses.trainer_id': req.user._id, isActive: true }),
      CourseModule.aggregate([
        { $match: { course_id: { $in: courseIds } } },
        { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }
      ]),
      Exam.countDocuments({ created_by: req.user._id }),
      require('../models/Transaction').aggregate([
        { $match: { category: 'trainer_commission', notes: { $regex: req.user._id.toString() } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const m = modAgg[0] || { total: 0, completed: 0 };

    const earned = totalCommission[0]?.total || 0;

    res.json({
      teacher,
      stats: {
        studentCount,
        courseCount: myCourses.length,
        modulesTotal: m.total,
        modulesCompleted: m.completed,
        examCount,
        totalEarnings: earned,
      },
      assignedCourses: myCourses
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTeacherTimetable = async (req, res) => {
  try {
    const batches = await Batch.find({ trainer_id: req.user._id })
      .sort({ is_active: -1, course_name: 1 });
    if (!batches.length) return res.json({ schedules: [], batches: [] });

    const batchIds = batches.map(b => b._id);
    const schedules = await Schedule.find({ batch_id: { $in: batchIds } })
      .populate('batch_id')
      .sort({ day_of_week: 1, start_time: 1 });

    res.json({ schedules, batches });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getTeacherProfile,
  getTeacherDashboard, getTeacherCourses, getTeacherStudents,
  getTeacherAttendance, markTeacherAttendance,
  getTeacherExams, createTeacherExam, getTeacherExamResults, saveTeacherResult, deleteTeacherExam,
  getTeacherTimetable,
};
