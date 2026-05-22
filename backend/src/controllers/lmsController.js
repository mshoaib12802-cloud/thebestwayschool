const CourseModule   = require('../models/CourseModule');
const VideoProgress  = require('../models/VideoProgress');
const Discussion     = require('../models/Discussion');
const Student        = require('../models/Student');
const Course         = require('../models/Course');

// ── helpers ──────────────────────────────────────────────────────────────────

const getEnrolledCourseIds = async (userId) => {
  const student = await Student.findOne({ user_id: userId }).select('courses');
  if (!student || !student.courses.length) return [];

  // Try direct course_id refs first (new enrolments)
  const directIds = student.courses.map(c => c.course_id).filter(Boolean);
  if (directIds.length) return directIds;

  // Fallback: match by course_name (existing data has no course_id)
  const names = student.courses.map(c => c.course_name).filter(Boolean);
  if (!names.length) return [];
  const found = await Course.find({ name: { $in: names } }).select('_id').lean();
  return found.map(c => c._id);
};

// ── Student endpoints ─────────────────────────────────────────────────────────

// GET /api/lms/my-courses
// Returns enrolled courses with LMS video progress stats
const getMyCourses = async (req, res) => {
  try {
    const courseIds = await getEnrolledCourseIds(req.user._id);
    if (!courseIds.length) return res.json([]);

    const courses = await Course.find({ _id: { $in: courseIds }, is_active: true }).lean();

    const result = await Promise.all(courses.map(async (c) => {
      const modules = await CourseModule.find({ course_id: c._id, video_url: { $ne: '' } }).sort({ order: 1 }).lean();
      const progresses = await VideoProgress.find({
        student_id: req.user._id,
        course_id: c._id,
      }).lean();

      const progressMap = {};
      progresses.forEach(p => { progressMap[p.module_id.toString()] = p; });

      const totalVideo   = modules.length;
      const watchedCount = modules.filter(m => progressMap[m._id.toString()]?.watched).length;
      const completedCount = modules.filter(m => progressMap[m._id.toString()]?.completed).length;
      const courseDone = totalVideo > 0 && completedCount === totalVideo;

      return {
        ...c,
        lms: {
          total_videos:    totalVideo,
          watched:         watchedCount,
          completed:       completedCount,
          progress_pct:    totalVideo > 0 ? Math.round((completedCount / totalVideo) * 100) : 0,
          course_complete: courseDone,
        }
      };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/lms/course/:courseId/modules
// Returns modules for a course with this student's progress on each
const getCourseModulesWithProgress = async (req, res) => {
  try {
    const courseIds = await getEnrolledCourseIds(req.user._id);
    const isEnrolled = courseIds.some(id => id.toString() === req.params.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

    const modules = await CourseModule.find({ course_id: req.params.courseId }).sort({ order: 1 }).lean();
    const progresses = await VideoProgress.find({
      student_id: req.user._id,
      course_id:  req.params.courseId,
    }).lean();

    const progressMap = {};
    progresses.forEach(p => { progressMap[p.module_id.toString()] = p; });

    const modulesWithProgress = modules.map(m => ({
      ...m,
      progress: progressMap[m._id.toString()] || null,
    }));

    res.json(modulesWithProgress);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/lms/module/:moduleId/watched
// Mark a video as watched — unlocks quiz if one exists; completes module if no quiz
const markWatched = async (req, res) => {
  try {
    const mod = await CourseModule.findById(req.params.moduleId).lean();
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    if (!mod.video_url) return res.status(400).json({ message: 'No video on this module' });

    const hasQuiz = mod.quiz?.questions?.length > 0;

    const progress = await VideoProgress.findOneAndUpdate(
      { student_id: req.user._id, module_id: mod._id },
      {
        $set: {
          watched:    true,
          watched_at: new Date(),
          course_id:  mod.course_id,
          // auto-complete if no quiz
          ...((!hasQuiz) && { completed: true, completed_at: new Date() }),
        }
      },
      { upsert: true, new: true }
    );

    res.json(progress);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/lms/module/:moduleId/quiz
// Submit quiz answers → grade, update progress
const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body; // [{ question_id, selected_index }]
    if (!Array.isArray(answers)) return res.status(400).json({ message: 'answers array required' });

    const mod = await CourseModule.findById(req.params.moduleId).lean();
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    if (!mod.quiz?.questions?.length) return res.status(400).json({ message: 'No quiz on this module' });

    // Must have watched first
    const existing = await VideoProgress.findOne({ student_id: req.user._id, module_id: mod._id });
    if (!existing?.watched) return res.status(400).json({ message: 'Watch the video before taking the quiz' });

    const MAX_ATTEMPTS = 3;
    if (existing.quiz_attempts >= MAX_ATTEMPTS) {
      return res.status(400).json({ message: `Maximum ${MAX_ATTEMPTS} attempts reached` });
    }

    // Grade
    let score = 0;
    let total = 0;
    const questions = mod.quiz.questions;
    const answerMap = {};
    answers.forEach(a => { answerMap[a.question_id] = a.selected_index; });

    const gradedQuestions = questions.map(q => {
      const selected = answerMap[q._id.toString()];
      const correct  = q.correct_index;
      const isCorrect = selected === correct;
      const pts = isCorrect ? q.marks : 0;
      score += pts;
      total += q.marks;
      return { question_id: q._id, selected_index: selected, correct_index: correct, is_correct: isCorrect, marks: pts };
    });

    const pct     = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed  = pct >= (mod.quiz.pass_percent || 70);

    const updated = await VideoProgress.findOneAndUpdate(
      { student_id: req.user._id, module_id: mod._id },
      {
        $set: {
          quiz_score:    score,
          quiz_total:    total,
          quiz_passed:   passed,
          ...(passed && { completed: true, completed_at: new Date() }),
        },
        $inc: { quiz_attempts: 1 },
      },
      { new: true }
    );

    res.json({
      score, total, pct, passed,
      quiz_attempts: updated.quiz_attempts,
      attempts_remaining: MAX_ATTEMPTS - updated.quiz_attempts,
      graded_questions: gradedQuestions,
      progress: updated,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/lms/course/:courseId/certificate
// Returns certificate eligibility + data for the student
const getCourseCertificate = async (req, res) => {
  try {
    const courseIds = await getEnrolledCourseIds(req.user._id);
    const isEnrolled = courseIds.some(id => id.toString() === req.params.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled' });

    const course   = await Course.findById(req.params.courseId).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const modules  = await CourseModule.find({ course_id: req.params.courseId, video_url: { $ne: '' } }).lean();
    if (!modules.length) return res.status(400).json({ message: 'No video lessons in this course' });

    const progresses = await VideoProgress.find({
      student_id: req.user._id,
      course_id:  req.params.courseId,
      completed:  true,
    }).lean();

    const completedIds = new Set(progresses.map(p => p.module_id.toString()));
    const allDone = modules.every(m => completedIds.has(m._id.toString()));

    if (!allDone) {
      return res.status(400).json({
        message: 'Complete all video lessons and quizzes first',
        completed: completedIds.size,
        total: modules.length,
      });
    }

    const student = await Student.findOne({ user_id: req.user._id })
      .populate('user_id', 'name email').lean();

    const completedAt = progresses.reduce((latest, p) => {
      return (!latest || p.completed_at > latest) ? p.completed_at : latest;
    }, null);

    res.json({
      eligible: true,
      course_name:   course.name,
      student_name:  student?.user_id?.name || req.user.name,
      completed_at:  completedAt,
      modules_done:  modules.length,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Teacher / Admin endpoints ─────────────────────────────────────────────────

// GET /api/lms/course/:courseId/student-progress
// Returns all students' progress per module for a course (teacher/admin view)
const getCourseStudentProgress = async (req, res) => {
  try {
    const modules = await CourseModule.find({
      course_id: req.params.courseId,
      video_url: { $ne: '' },
    }).sort({ order: 1 }).select('_id title order').lean();

    if (!modules.length) return res.json({ modules: [], students: [] });

    const moduleIds = modules.map(m => m._id);
    const progresses = await VideoProgress.find({ module_id: { $in: moduleIds } })
      .populate('student_id', 'name email').lean();

    // Group by student
    const studentMap = {};
    progresses.forEach(p => {
      const sid = p.student_id?._id?.toString();
      if (!sid) return;
      if (!studentMap[sid]) {
        studentMap[sid] = {
          student_id:   sid,
          student_name: p.student_id.name,
          modules: {},
        };
      }
      studentMap[sid].modules[p.module_id.toString()] = {
        watched:       p.watched,
        completed:     p.completed,
        quiz_passed:   p.quiz_passed,
        quiz_score:    p.quiz_score,
        quiz_total:    p.quiz_total,
        quiz_attempts: p.quiz_attempts,
      };
    });

    const students = Object.values(studentMap).map(s => {
      const done = modules.filter(m => s.modules[m._id.toString()]?.completed).length;
      return { ...s, completed_count: done, total: modules.length, pct: Math.round((done / modules.length) * 100) };
    });

    res.json({ modules, students });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/lms/module/:moduleId/notes  (student only)
const saveNotes = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only' });
    const { notes } = req.body;
    const mod = await CourseModule.findById(req.params.moduleId).lean();
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    await VideoProgress.findOneAndUpdate(
      { student_id: req.user._id, module_id: mod._id },
      { $set: { student_notes: (notes || '').slice(0, 5000), course_id: mod.course_id } },
      { upsert: true, new: true }
    );
    res.json({ message: 'Notes saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/lms/module/:moduleId/discussions
const getDiscussions = async (req, res) => {
  try {
    const roots = await Discussion.find({ module_id: req.params.moduleId, parent_id: null })
      .populate('author_id', 'name role _id')
      .sort({ is_pinned: -1, createdAt: -1 })
      .lean();

    const withReplies = await Promise.all(roots.map(async d => {
      const replies = await Discussion.find({ parent_id: d._id })
        .populate('author_id', 'name role _id')
        .sort({ createdAt: 1 })
        .lean();
      return { ...d, replies };
    }));

    res.json(withReplies);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/lms/module/:moduleId/discussions
const postDiscussion = async (req, res) => {
  try {
    const { message, parent_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message required' });

    const mod = await CourseModule.findById(req.params.moduleId).lean();
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    const isTeacher = ['teacher', 'admin'].includes(req.user.role);

    // Validate parent belongs to same module
    if (parent_id) {
      const parent = await Discussion.findById(parent_id).lean();
      if (!parent || parent.module_id.toString() !== mod._id.toString()) {
        return res.status(400).json({ message: 'Invalid parent discussion' });
      }
    }

    const disc = await Discussion.create({
      module_id:  mod._id,
      course_id:  mod.course_id,
      author_id:  req.user._id,
      parent_id:  parent_id || null,
      message:    message.trim().slice(0, 2000),
      is_teacher: isTeacher,
    });

    const populated = await Discussion.findById(disc._id)
      .populate('author_id', 'name role _id')
      .lean();
    res.json({ ...populated, replies: [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/lms/discussion/:discussionId
const deleteDiscussion = async (req, res) => {
  try {
    const disc = await Discussion.findById(req.params.discussionId);
    if (!disc) return res.status(404).json({ message: 'Not found' });

    const isOwner = disc.author_id.toString() === req.user._id.toString();
    const isAdmin  = ['teacher', 'admin'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    await Discussion.deleteMany({ parent_id: disc._id });
    await disc.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getMyCourses,
  getCourseModulesWithProgress,
  markWatched,
  submitQuiz,
  getCourseCertificate,
  getCourseStudentProgress,
  saveNotes,
  getDiscussions,
  postDiscussion,
  deleteDiscussion,
};
