const Message        = require('../models/Message');
const User           = require('../models/User');
const Student        = require('../models/Student');
const ClassTimetable = require('../models/ClassTimetable');
const SchoolClass    = require('../models/SchoolClass');

// Contacts: student → their teachers (by subject); teacher → their students
const getContacts = async (req, res) => {
  try {
    const me = req.user;
    let contacts = [];

    if (me.role === 'student') {
      const student = await Student.findOne({ user_id: me._id })
        .select('courses school_class_id academic_year_id').lean();
      if (!student) return res.json([]);

      // teacherId (string) → Set of subject/course names
      const teacherSubjectMap = {};

      // --- School system: class teacher + all subject teachers from timetable ---
      if (student.school_class_id) {
        // 1. Class teacher (always a contact regardless of timetable)
        const schoolClass = await SchoolClass.findById(student.school_class_id).select('class_teacher').lean();
        if (schoolClass?.class_teacher) {
          const tid = schoolClass.class_teacher.toString();
          if (!teacherSubjectMap[tid]) teacherSubjectMap[tid] = new Set();
          teacherSubjectMap[tid].add('Class Teacher');
        }

        // 2. Subject teachers from timetable entries
        const entries = await ClassTimetable.find({
          class_id:         student.school_class_id,
          academic_year_id: student.academic_year_id,
          teacher_id:       { $ne: null },
        }).populate('subject_id', 'name').lean();

        for (const e of entries) {
          const tid = e.teacher_id.toString();
          if (!teacherSubjectMap[tid]) teacherSubjectMap[tid] = new Set();
          if (e.subject_id?.name) teacherSubjectMap[tid].add(e.subject_id.name);
        }
      }

      // --- Legacy academy: courses.trainer_id ---
      for (const c of (student.courses || [])) {
        if (!c.trainer_id) continue;
        const tid = c.trainer_id.toString();
        if (!teacherSubjectMap[tid]) teacherSubjectMap[tid] = new Set();
        if (c.course_name) teacherSubjectMap[tid].add(c.course_name);
      }

      const teacherIds = Object.keys(teacherSubjectMap);
      if (!teacherIds.length) return res.json([]);

      await Message.updateMany({ to: me._id, delivered: false }, { delivered: true });

      const teachers = await User.find({ _id: { $in: teacherIds } }).select('name email role').lean();

      contacts = await Promise.all(teachers.map(async (t) => {
        const [lastMsg] = await Message.find({
          $or: [{ from: me._id, to: t._id }, { from: t._id, to: me._id }],
        }).sort({ createdAt: -1 }).limit(1).lean();
        const unread = await Message.countDocuments({ from: t._id, to: me._id, read: false });
        return {
          _id:         t._id,
          name:        t.name,
          role:        t.role,
          subjects:    [...teacherSubjectMap[t._id.toString()]],
          lastMessage: lastMsg?.text ?? null,
          lastTime:    lastMsg?.createdAt ?? null,
          unread,
        };
      }));

    } else if (me.role === 'parent') {
      // Parent → their children's class teacher + subject teachers
      const children = await Student.find({ parent_id: me._id, isActive: true })
        .select('school_class_id academic_year_id').lean();
      if (!children.length) return res.json([]);

      const teacherSubjectMap = {};

      for (const child of children) {
        if (!child.school_class_id) continue;
        const schoolClass = await SchoolClass.findById(child.school_class_id).select('class_teacher').lean();
        if (schoolClass?.class_teacher) {
          const tid = schoolClass.class_teacher.toString();
          if (!teacherSubjectMap[tid]) teacherSubjectMap[tid] = new Set();
          teacherSubjectMap[tid].add('Class Teacher');
        }
        const entries = await ClassTimetable.find({
          class_id: child.school_class_id,
          academic_year_id: child.academic_year_id,
          teacher_id: { $ne: null },
        }).populate('subject_id', 'name').lean();
        for (const e of entries) {
          const tid = e.teacher_id.toString();
          if (!teacherSubjectMap[tid]) teacherSubjectMap[tid] = new Set();
          if (e.subject_id?.name) teacherSubjectMap[tid].add(e.subject_id.name);
        }
      }

      const teacherIds = Object.keys(teacherSubjectMap);
      if (!teacherIds.length) return res.json([]);

      await Message.updateMany({ to: me._id, delivered: false }, { delivered: true });
      const teachers = await User.find({ _id: { $in: teacherIds } }).select('name email role').lean();

      contacts = await Promise.all(teachers.map(async (t) => {
        const [lastMsg] = await Message.find({
          $or: [{ from: me._id, to: t._id }, { from: t._id, to: me._id }],
        }).sort({ createdAt: -1 }).limit(1).lean();
        const unread = await Message.countDocuments({ from: t._id, to: me._id, read: false });
        return {
          _id: t._id, name: t.name, role: t.role,
          subjects: [...teacherSubjectMap[t._id.toString()]],
          lastMessage: lastMsg?.text ?? null,
          lastTime: lastMsg?.createdAt ?? null,
          unread,
        };
      }));

    } else if (me.role === 'teacher') {
      // --- School system: all classes this teacher is assigned to ---
      const [ttClassIds, ctClassIds] = await Promise.all([
        ClassTimetable.distinct('class_id', { teacher_id: me._id }),
        SchoolClass.distinct('_id',         { class_teacher: me._id }),
      ]);
      const allClassIds = [...new Set([
        ...ttClassIds.map(id => id.toString()),
        ...ctClassIds.map(id => id.toString()),
      ])];

      const schoolStudents = allClassIds.length
        ? await Student.find({ school_class_id: { $in: allClassIds }, isActive: true, user_id: { $ne: null } }).select('user_id parent_id').lean()
        : [];

      // Parents of school students
      const parentIds = [...new Set(
        schoolStudents.filter(s => s.parent_id).map(s => s.parent_id.toString())
      )];
      const parentUsers = parentIds.length
        ? await User.find({ _id: { $in: parentIds } }).select('_id').lean()
        : [];
      const parentUserIds = parentUsers.map(u => u._id);

      // --- Legacy academy ---
      const courseStudents = await Student.find({
        'courses.trainer_id': me._id, isActive: true, user_id: { $ne: null },
      }).select('user_id').lean();

      const seen = new Set();
      const studentUserIds = [];
      for (const s of [...schoolStudents, ...courseStudents]) {
        const uid = s.user_id.toString();
        if (!seen.has(uid)) { seen.add(uid); studentUserIds.push(s.user_id); }
      }

      const allContactIds = [...studentUserIds, ...parentUserIds];
      if (!allContactIds.length) return res.json([]);

      await Message.updateMany({ to: me._id, delivered: false }, { delivered: true });

      const studentUsers = await User.find({ _id: { $in: allContactIds } }).select('name email role').lean();

      contacts = await Promise.all(studentUsers.map(async (u) => {
        const [lastMsg] = await Message.find({
          $or: [{ from: me._id, to: u._id }, { from: u._id, to: me._id }],
        }).sort({ createdAt: -1 }).limit(1).lean();
        const unread = await Message.countDocuments({ from: u._id, to: me._id, read: false });
        return {
          _id:         u._id,
          name:        u.name,
          role:        u.role,
          lastMessage: lastMsg?.text ?? null,
          lastTime:    lastMsg?.createdAt ?? null,
          unread,
        };
      }));
    }

    contacts.sort((a, b) => {
      if (!a.lastTime && !b.lastTime) return 0;
      if (!a.lastTime) return 1;
      if (!b.lastTime) return -1;
      return new Date(b.lastTime) - new Date(a.lastTime);
    });

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Full thread between me and another user (also marks incoming as read)
const getThread = async (req, res) => {
  try {
    const me    = req.user._id;
    const other = req.params.userId;

    const messages = await Message.find({
      $or: [
        { from: me,    to: other },
        { from: other, to: me    },
      ],
    }).sort({ createdAt: 1 }).limit(100).lean();

    await Message.updateMany({ from: other, to: me, delivered: false }, { delivered: true });
    await Message.updateMany({ from: other, to: me, read: false }, { read: true });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text?.trim()) {
      return res.status(400).json({ message: 'to and text are required' });
    }
    const msg = await Message.create({ from: req.user._id, to, text: text.trim() });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Total unread count for the current user (used for the badge on the floating button)
const getUnreadCount = async (req, res) => {
  try {
    const me = req.user._id;
    await Message.updateMany({ to: me, delivered: false }, { delivered: true });
    const count = await Message.countDocuments({ to: me, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getContacts, getThread, sendMessage, getUnreadCount };
