const SubjectLesson  = require('../models/SubjectLesson');
const LessonProgress = require('../models/LessonProgress');
const Discussion     = require('../models/Discussion');
const Student        = require('../models/Student');
const Subject        = require('../models/Subject');
const ClassTimetable = require('../models/ClassTimetable');
const path           = require('path');
const fs             = require('fs');

// ── helpers ───────────────────────────────────────────────────────────────────

const getStudentSubjectIds = async (userId) => {
  const student = await Student.findOne({ user_id: userId })
    .select('school_class_id academic_year_id').lean();
  if (!student?.school_class_id) return [];
  return ClassTimetable.distinct('subject_id', {
    class_id:         student.school_class_id,
    academic_year_id: student.academic_year_id,
    subject_id:       { $ne: null },
  });
};

const getTeacherSubjectIds = async (teacherId) => {
  return ClassTimetable.distinct('subject_id', {
    teacher_id: teacherId,
    subject_id: { $ne: null },
  });
};

// ── Student endpoints ─────────────────────────────────────────────────────────

const getMySubjects = async (req, res) => {
  try {
    const subjectIds = await getStudentSubjectIds(req.user._id);
    if (!subjectIds.length) return res.json([]);

    const subjects = await Subject.find({ _id: { $in: subjectIds }, is_active: true })
      .populate('teacher_id', 'name').lean();

    const result = await Promise.all(subjects.map(async (sub) => {
      const lessons   = await SubjectLesson.find({ subject_id: sub._id, is_published: true }).select('_id').lean();
      const lessonIds = lessons.map(l => l._id);
      const completed = lessonIds.length
        ? await LessonProgress.countDocuments({ student_id: req.user._id, lesson_id: { $in: lessonIds }, completed: true })
        : 0;
      return {
        ...sub,
        total_lessons:     lessons.length,
        completed_lessons: completed,
        progress_pct:      lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0,
      };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSubjectLessons = async (req, res) => {
  try {
    const subjectIds  = await getStudentSubjectIds(req.user._id);
    const isInSubject = subjectIds.some(id => id.toString() === req.params.subjectId);
    if (!isInSubject) return res.status(403).json({ message: 'Not enrolled in this subject' });

    const lessons = await SubjectLesson.find({ subject_id: req.params.subjectId, is_published: true })
      .sort({ order: 1 }).lean();

    const progresses = await LessonProgress.find({
      student_id: req.user._id,
      subject_id: req.params.subjectId,
    }).lean();
    const progressMap = {};
    progresses.forEach(p => { progressMap[p.lesson_id.toString()] = p; });

    res.json(lessons.map(l => ({ ...l, progress: progressMap[l._id.toString()] || null })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markLessonWatched = async (req, res) => {
  try {
    const lesson = await SubjectLesson.findById(req.params.lessonId).lean();
    if (!lesson || !lesson.is_published) return res.status(404).json({ message: 'Lesson not found' });
    if (!lesson.video_url) return res.status(400).json({ message: 'No video on this lesson' });

    const hasQuiz = lesson.quiz?.questions?.length > 0;
    const progress = await LessonProgress.findOneAndUpdate(
      { student_id: req.user._id, lesson_id: lesson._id },
      {
        $set: {
          watched:    true,
          watched_at: new Date(),
          subject_id: lesson.subject_id,
          ...(!hasQuiz && { completed: true, completed_at: new Date() }),
        },
      },
      { upsert: true, new: true }
    );
    res.json(progress);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const submitLessonQuiz = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ message: 'answers array required' });

    const lesson = await SubjectLesson.findById(req.params.lessonId).lean();
    if (!lesson || !lesson.is_published) return res.status(404).json({ message: 'Lesson not found' });
    if (!lesson.quiz?.questions?.length)  return res.status(400).json({ message: 'No quiz on this lesson' });

    const existing = await LessonProgress.findOne({ student_id: req.user._id, lesson_id: lesson._id });
    if (!existing?.watched) return res.status(400).json({ message: 'Watch the video before taking the quiz' });

    const MAX_ATTEMPTS = 3;
    if ((existing.quiz_attempts || 0) >= MAX_ATTEMPTS)
      return res.status(400).json({ message: `Maximum ${MAX_ATTEMPTS} attempts reached` });

    let score = 0, total = 0;
    const answerMap = {};
    answers.forEach(a => { answerMap[a.question_id] = a.selected_index; });

    const graded = lesson.quiz.questions.map(q => {
      const selected  = answerMap[q._id.toString()];
      const isCorrect = selected === q.correct_index;
      const pts       = isCorrect ? q.marks : 0;
      score += pts; total += q.marks;
      return { question_id: q._id, selected_index: selected, correct_index: q.correct_index, is_correct: isCorrect, marks: pts };
    });

    const pct    = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = pct >= (lesson.quiz.pass_percent || 70);

    const updated = await LessonProgress.findOneAndUpdate(
      { student_id: req.user._id, lesson_id: lesson._id },
      {
        $set: {
          quiz_score:  score,
          quiz_total:  total,
          quiz_passed: passed,
          ...(passed && { completed: true, completed_at: new Date() }),
        },
        $inc: { quiz_attempts: 1 },
      },
      { new: true }
    );

    res.json({
      score, total, pct, passed,
      quiz_attempts:     updated.quiz_attempts,
      attempts_remaining: MAX_ATTEMPTS - updated.quiz_attempts,
      graded,
      progress: updated,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const saveLessonNotes = async (req, res) => {
  try {
    const { notes } = req.body;
    const lesson = await SubjectLesson.findById(req.params.lessonId).lean();
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    await LessonProgress.findOneAndUpdate(
      { student_id: req.user._id, lesson_id: lesson._id },
      { $set: { student_notes: (notes || '').slice(0, 5000), subject_id: lesson.subject_id } },
      { upsert: true, new: true }
    );
    res.json({ message: 'Notes saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getLessonDiscussions = async (req, res) => {
  try {
    const roots = await Discussion.find({ module_id: req.params.lessonId, parent_id: null })
      .populate('author_id', 'name role _id')
      .sort({ is_pinned: -1, createdAt: -1 })
      .lean();
    const withReplies = await Promise.all(roots.map(async d => {
      const replies = await Discussion.find({ parent_id: d._id })
        .populate('author_id', 'name role _id')
        .sort({ createdAt: 1 }).lean();
      return { ...d, replies };
    }));
    res.json(withReplies);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const postLessonDiscussion = async (req, res) => {
  try {
    const { message, parent_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message required' });
    const lesson = await SubjectLesson.findById(req.params.lessonId).lean();
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const disc = await Discussion.create({
      module_id:  lesson._id,
      course_id:  lesson.subject_id,
      author_id:  req.user._id,
      parent_id:  parent_id || null,
      message:    message.trim().slice(0, 2000),
      is_teacher: ['teacher', 'admin'].includes(req.user.role),
    });
    const populated = await Discussion.findById(disc._id)
      .populate('author_id', 'name role _id').lean();
    res.json({ ...populated, replies: [] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteLessonDiscussion = async (req, res) => {
  try {
    const disc = await Discussion.findById(req.params.discId);
    if (!disc) return res.status(404).json({ message: 'Not found' });
    const isOwner = disc.author_id.toString() === req.user._id.toString();
    const isMod   = ['teacher', 'admin'].includes(req.user.role);
    if (!isOwner && !isMod) return res.status(403).json({ message: 'Not authorized' });
    await Discussion.deleteMany({ parent_id: disc._id });
    await disc.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Teacher endpoints ─────────────────────────────────────────────────────────

const getTeacherSubjects = async (req, res) => {
  try {
    const subjectIds = await getTeacherSubjectIds(req.user._id);
    if (!subjectIds.length) return res.json([]);

    const subjects = await Subject.find({ _id: { $in: subjectIds }, is_active: true })
      .populate('class_id', 'name section grade_level').lean();

    const result = await Promise.all(subjects.map(async (sub) => {
      const total     = await SubjectLesson.countDocuments({ subject_id: sub._id });
      const published = await SubjectLesson.countDocuments({ subject_id: sub._id, is_published: true });
      return { ...sub, total_lessons: total, published_lessons: published };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTeacherSubjectLessons = async (req, res) => {
  try {
    const mySubjectIds = await getTeacherSubjectIds(req.user._id);
    const isMySubject  = mySubjectIds.some(id => id.toString() === req.params.subjectId);
    if (!isMySubject) return res.status(403).json({ message: 'Not your subject' });

    const lessons = await SubjectLesson.find({ subject_id: req.params.subjectId })
      .sort({ order: 1 }).lean();
    res.json(lessons);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createLesson = async (req, res) => {
  try {
    const mySubjectIds = await getTeacherSubjectIds(req.user._id);
    const isMySubject  = mySubjectIds.some(id => id.toString() === req.params.subjectId);
    if (!isMySubject) return res.status(403).json({ message: 'Not your subject' });

    const lastLesson = await SubjectLesson.findOne({ subject_id: req.params.subjectId }).sort({ order: -1 }).lean();
    const order      = lastLesson ? lastLesson.order + 1 : 1;

    const { title, description, type, video_url, video_title, video_duration_mins, resources, quiz, teacher_notes } = req.body;
    const lesson = await SubjectLesson.create({
      subject_id: req.params.subjectId,
      teacher_id: req.user._id,
      title, description, type, order,
      video_url:           video_url || '',
      video_title:         video_title || '',
      video_duration_mins: Number(video_duration_mins) || 0,
      resources:           resources || [],
      quiz:                quiz || { pass_percent: 70, questions: [] },
      teacher_notes:       teacher_notes || '',
    });
    res.status(201).json(lesson);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const updateLesson = async (req, res) => {
  try {
    const lesson = await SubjectLesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const mySubjectIds = await getTeacherSubjectIds(req.user._id);
    const isMySubject  = mySubjectIds.some(id => id.toString() === lesson.subject_id.toString());
    if (!isMySubject) return res.status(403).json({ message: 'Not your lesson' });

    const { title, description, type, video_url, video_title, video_duration_mins, resources, quiz, teacher_notes, notes_visible } = req.body;
    Object.assign(lesson, {
      title, description, type, video_url, video_title,
      video_duration_mins: Number(video_duration_mins) || 0,
      resources, quiz, teacher_notes, notes_visible,
    });
    await lesson.save();
    res.json(lesson);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const deleteLesson = async (req, res) => {
  try {
    const lesson = await SubjectLesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const mySubjectIds = await getTeacherSubjectIds(req.user._id);
    const isMySubject  = mySubjectIds.some(id => id.toString() === lesson.subject_id.toString());
    if (!isMySubject) return res.status(403).json({ message: 'Not your lesson' });

    const subId = lesson.subject_id;
    await SubjectLesson.deleteOne({ _id: lesson._id });

    const remaining = await SubjectLesson.find({ subject_id: subId }).sort({ order: 1 });
    for (let i = 0; i < remaining.length; i++) { remaining[i].order = i + 1; await remaining[i].save(); }

    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const togglePublish = async (req, res) => {
  try {
    const lesson = await SubjectLesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const mySubjectIds = await getTeacherSubjectIds(req.user._id);
    const isMySubject  = mySubjectIds.some(id => id.toString() === lesson.subject_id.toString());
    if (!isMySubject) return res.status(403).json({ message: 'Not your lesson' });

    lesson.is_published = !lesson.is_published;
    await lesson.save();
    res.json(lesson);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSubjectStudentProgress = async (req, res) => {
  try {
    const mySubjectIds = await getTeacherSubjectIds(req.user._id);
    const isMySubject  = mySubjectIds.some(id => id.toString() === req.params.subjectId);
    if (!isMySubject) return res.status(403).json({ message: 'Not your subject' });

    const lessons = await SubjectLesson.find({ subject_id: req.params.subjectId, is_published: true })
      .sort({ order: 1 }).select('_id title order video_url').lean();
    if (!lessons.length) return res.json({ lessons: [], students: [] });

    const lessonIds  = lessons.map(l => l._id);
    const progresses = await LessonProgress.find({ lesson_id: { $in: lessonIds } })
      .populate('student_id', 'name email').lean();

    const studentMap = {};
    progresses.forEach(p => {
      const sid = p.student_id?._id?.toString();
      if (!sid) return;
      if (!studentMap[sid]) studentMap[sid] = { student_id: sid, student_name: p.student_id.name, lessons: {} };
      studentMap[sid].lessons[p.lesson_id.toString()] = {
        watched: p.watched, completed: p.completed,
        quiz_passed: p.quiz_passed, quiz_score: p.quiz_score, quiz_total: p.quiz_total,
      };
    });

    const students = Object.values(studentMap).map(s => {
      const done = lessons.filter(l => s.lessons[l._id.toString()]?.completed).length;
      return { ...s, completed_count: done, total: lessons.length, pct: Math.round((done / lessons.length) * 100) };
    });

    res.json({ lessons, students });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const uploadLessonPdf = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No PDF file uploaded' });
    const lesson = await SubjectLesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const mySubjectIds = await getTeacherSubjectIds(req.user._id);
    const isMySubject  = mySubjectIds.some(id => id.toString() === lesson.subject_id.toString());
    if (!isMySubject) return res.status(403).json({ message: 'Not your lesson' });

    const title = (req.body.title || '').trim() || req.file.originalname.replace(/\.pdf$/i, '');
    lesson.pdf_files.push({
      title,
      filename:      req.file.filename,
      original_name: req.file.originalname,
      size_bytes:    req.file.size,
    });
    await lesson.save();
    res.json(lesson);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteLessonPdf = async (req, res) => {
  try {
    const lesson = await SubjectLesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const mySubjectIds = await getTeacherSubjectIds(req.user._id);
    const isMySubject  = mySubjectIds.some(id => id.toString() === lesson.subject_id.toString());
    if (!isMySubject) return res.status(403).json({ message: 'Not your lesson' });

    const pdf = lesson.pdf_files.id(req.params.pdfId);
    if (!pdf) return res.status(404).json({ message: 'PDF not found' });

    const filePath = path.join(__dirname, '../../uploads/lms-pdfs', pdf.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    lesson.pdf_files.pull(req.params.pdfId);
    await lesson.save();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getMySubjects, getSubjectLessons,
  markLessonWatched, submitLessonQuiz, saveLessonNotes,
  getLessonDiscussions, postLessonDiscussion, deleteLessonDiscussion,
  getTeacherSubjects, getTeacherSubjectLessons,
  createLesson, updateLesson, deleteLesson, togglePublish,
  getSubjectStudentProgress,
  uploadLessonPdf, deleteLessonPdf,
};
