const DateSheet = require('../models/DateSheet');
const Course = require('../models/Course');
const Student = require('../models/Student');

// GET all date sheets (admin)
const getDateSheets = async (req, res) => {
  try {
    const sheets = await DateSheet.find()
      .populate('created_by', 'name')
      .populate('batch_id', 'name shift')
      .sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET single date sheet
const getDateSheet = async (req, res) => {
  try {
    const sheet = await DateSheet.findById(req.params.id)
      .populate('created_by', 'name')
      .populate('batch_id', 'name shift');
    if (!sheet) return res.status(404).json({ message: 'Date sheet not found' });
    res.json(sheet);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET students enrolled in a course (for admin to see who will receive it)
const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const students = await Student.find({
      isActive: true,
      'courses.course_name': course.name,
    }).select('full_name roll_number father_name phone');

    res.json({ course_name: course.name, students });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST create date sheet
const createDateSheet = async (req, res) => {
  try {
    const { title, course_id, batch_id, description, academic_year, entries } = req.body;
    const course = await Course.findById(course_id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const sheet = await DateSheet.create({
      title,
      course_id,
      course_name: course.name,
      batch_id: batch_id || null,
      description,
      academic_year,
      entries: entries || [],
      created_by: req.user._id,
    });
    res.status(201).json(sheet);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT update date sheet
const updateDateSheet = async (req, res) => {
  try {
    const { title, description, academic_year, entries, batch_id } = req.body;
    const sheet = await DateSheet.findByIdAndUpdate(
      req.params.id,
      { title, description, academic_year, entries, batch_id: batch_id || null },
      { new: true }
    );
    if (!sheet) return res.status(404).json({ message: 'Date sheet not found' });
    res.json(sheet);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT publish / unpublish
const togglePublish = async (req, res) => {
  try {
    const sheet = await DateSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Date sheet not found' });

    sheet.is_published = !sheet.is_published;
    sheet.published_at = sheet.is_published ? new Date() : null;
    await sheet.save();
    res.json(sheet);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE date sheet
const deleteDateSheet = async (req, res) => {
  try {
    await DateSheet.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Student portal — get published date sheets for my courses
const getMyDateSheets = async (req, res) => {
  try {
    const student = await Student.findById(req.user.student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const courseNames = student.courses.map(c => c.course_name);
    const sheets = await DateSheet.find({
      is_published: true,
      course_name: { $in: courseNames },
    })
    .populate('batch_id', 'name shift')
    .sort({ createdAt: -1 });

    res.json(sheets);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getDateSheets, getDateSheet, getCourseStudents,
  createDateSheet, updateDateSheet, togglePublish, deleteDateSheet,
  getMyDateSheets,
};
