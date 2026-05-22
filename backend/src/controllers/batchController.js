const Batch = require('../models/Batch');
const Schedule = require('../models/Schedule');
const Student = require('../models/Student');
const Course = require('../models/Course');

const getBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('trainer_id', 'name role')
      .populate('course_id', 'name total_fee monthly_fee')
      .sort({ createdAt: -1 });

    // student count per batch
    const studentCounts = await Student.aggregate([
      { $unwind: '$courses' },
      { $match: { isActive: true, 'courses.batch_id': { $exists: true, $ne: null } } },
      { $group: { _id: '$courses.batch_id', count: { $sum: 1 } } },
    ]);
    const studentMap = {};
    studentCounts.forEach(s => { studentMap[s._id.toString()] = s.count; });

    // schedule slot count per batch
    const slotCounts = await Schedule.aggregate([
      { $group: { _id: '$batch_id', count: { $sum: 1 } } },
    ]);
    const slotMap = {};
    slotCounts.forEach(s => { slotMap[s._id.toString()] = s.count; });

    const result = batches.map(b => ({
      ...b.toObject(),
      enrolled_count: studentMap[b._id.toString()] || 0,
      slot_count: slotMap[b._id.toString()] || 0,
    }));

    res.json(result);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createBatch = async (req, res) => {
  try {
    const { course_id } = req.body;
    let course_name = req.body.course_name;
    if (course_id) {
      const course = await Course.findById(course_id);
      if (course) course_name = course.name;
    }
    const batch = await Batch.create({ ...req.body, course_name });
    res.status(201).json(batch);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('trainer_id', 'name role');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json(batch);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteBatch = async (req, res) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);
    await Schedule.deleteMany({ batch_id: req.params.id });
    res.json({ message: 'Batch deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const toggleBatchActive = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    batch.is_active = !batch.is_active;
    await batch.save();
    res.json(batch);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getBatchStudents = async (req, res) => {
  try {
    const students = await Student.find({
      isActive: true,
      'courses.batch_id': req.params.id,
    }).select('full_name roll_number phone courses');
    res.json(students);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const enrollStudent = async (req, res) => {
  try {
    const { student_id } = req.body;
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const student = await Student.findById(student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const courseIdx = student.courses.findIndex(c => c.course_name === batch.course_name);
    if (courseIdx === -1)
      return res.status(400).json({ message: `Student is not enrolled in "${batch.course_name}"` });

    student.courses[courseIdx].batch_id = batch._id;
    await student.save();
    res.json({ message: 'Student enrolled in batch' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const unenrollStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const courseIdx = student.courses.findIndex(c => c.batch_id?.toString() === req.params.id);
    if (courseIdx !== -1) {
      student.courses[courseIdx].batch_id = null;
      await student.save();
    }
    res.json({ message: 'Student removed from batch' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSchedules = async (req, res) => {
  try {
    const filter = req.query.batch_id ? { batch_id: req.query.batch_id } : {};
    const schedules = await Schedule.find(filter)
      .populate({ path: 'batch_id', populate: { path: 'trainer_id', select: 'name' } })
      .sort({ day_of_week: 1, start_time: 1 });
    res.json(schedules);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const addSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.create(req.body);
    res.status(201).json(schedule);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteSchedule = async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Schedule slot deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getBatches, createBatch, updateBatch, deleteBatch, toggleBatchActive, getBatchStudents, enrollStudent, unenrollStudent, getSchedules, addSchedule, deleteSchedule };
