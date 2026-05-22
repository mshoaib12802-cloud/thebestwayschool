const Course = require('../models/Course');
const Student = require('../models/Student');

const getPublicCourses = async (req, res) => {
  try {
    const [courses, enrollmentAgg] = await Promise.all([
      Course.find({ is_active: true }).sort({ createdAt: -1 }),
      Student.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$courses' },
        { $group: { _id: '$courses.course_name', count: { $sum: 1 } } }
      ])
    ]);
    const countMap = {};
    enrollmentAgg.forEach(e => { countMap[e._id] = e.count; });
    res.json(courses.map(c => ({
      _id: c._id,
      name: c.name,
      duration: c.duration,
      total_fee: c.total_fee,
      monthly_fee: c.monthly_fee,
      student_count: countMap[c.name] || 0,
    })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getCourses = async (req, res) => {
  try {
    const [courses, enrollmentAgg] = await Promise.all([
      Course.find().sort({ createdAt: -1 }),
      Student.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$courses' },
        { $group: { _id: '$courses.course_name', count: { $sum: 1 } } }
      ])
    ]);
    const countMap = {};
    enrollmentAgg.forEach(e => { countMap[e._id] = e.count; });
    res.json(courses.map(c => ({ ...c.toObject(), student_count: countMap[c.name] || 0 })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const addCourse = async (req, res) => {
  try {
    const { name, duration, total_fee, monthly_fee } = req.body;
    const course = await Course.create({ name, duration, total_fee: Number(total_fee), monthly_fee: Number(monthly_fee) });
    res.status(201).json(course);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getPublicCourses, getCourses, addCourse, updateCourse, deleteCourse };
