const CourseModule = require('../models/CourseModule');

// GET all modules for a course (sorted by order)
const getModulesByCourse = async (req, res) => {
  try {
    const modules = await CourseModule.find({ course_id: req.params.courseId })
      .sort({ order: 1 });
    res.json(modules);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// GET per-course module stats (used by course cards to show progress without loading all modules)
const getAllModuleStats = async (req, res) => {
  try {
    const stats = await CourseModule.aggregate([
      {
        $group: {
          _id: '$course_id',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } }
        }
      }
    ]);
    res.json(stats);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// POST add a new module to a course
const addModule = async (req, res) => {
  try {
    const { title, description, type, duration_days, resources, video_url, video_title, video_duration_mins, quiz } = req.body;
    const lastModule = await CourseModule.findOne({ course_id: req.params.courseId })
      .sort({ order: -1 });
    const order = lastModule ? lastModule.order + 1 : 1;

    const mod = await CourseModule.create({
      course_id: req.params.courseId,
      title, description, type, duration_days,
      resources: resources || [],
      video_url: video_url || '',
      video_title: video_title || '',
      video_duration_mins: video_duration_mins || 0,
      quiz: quiz || { pass_percent: 70, questions: [] },
      order,
      created_by: req.user._id
    });
    res.status(201).json(mod);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// PUT update module details
const updateModule = async (req, res) => {
  try {
    const { title, description, type, duration_days, resources, notes_visible, video_url, video_title, video_duration_mins, quiz } = req.body;
    const mod = await CourseModule.findByIdAndUpdate(
      req.params.id,
      { title, description, type, duration_days, resources, notes_visible, video_url, video_title, video_duration_mins, quiz },
      { new: true, runValidators: true }
    );
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    res.json(mod);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// PUT mark module as in_progress
const startModule = async (req, res) => {
  try {
    const mod = await CourseModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    if (mod.status !== 'upcoming') return res.status(400).json({ message: 'Module is not in upcoming state' });

    mod.status = 'in_progress';
    mod.started_date = new Date();
    await mod.save();
    res.json(mod);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// PUT mark module as completed
const completeModule = async (req, res) => {
  try {
    const { teacher_notes, notes_visible } = req.body;
    const mod = await CourseModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    if (mod.status === 'completed') return res.status(400).json({ message: 'Module already completed' });

    mod.status = 'completed';
    mod.completed_date = new Date();
    if (!mod.started_date) mod.started_date = new Date();
    if (teacher_notes !== undefined) mod.teacher_notes = teacher_notes;
    if (notes_visible !== undefined) mod.notes_visible = notes_visible;
    await mod.save();
    res.json(mod);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// PUT reset a completed/in_progress module back to upcoming
const resetModule = async (req, res) => {
  try {
    const mod = await CourseModule.findByIdAndUpdate(
      req.params.id,
      { status: 'upcoming', started_date: null, completed_date: null, teacher_notes: '' },
      { new: true }
    );
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    res.json(mod);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// PUT move module up or down (swap order with neighbour)
const moveModule = async (req, res) => {
  try {
    const { direction } = req.body; // 'up' | 'down'
    const mod = await CourseModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    const neighbour = await CourseModule.findOne({
      course_id: mod.course_id,
      order: direction === 'up' ? mod.order - 1 : mod.order + 1
    });

    if (!neighbour) return res.status(400).json({ message: 'Cannot move further' });

    const tempOrder = mod.order;
    mod.order = neighbour.order;
    neighbour.order = tempOrder;

    await mod.save();
    await neighbour.save();
    res.json({ message: 'Reordered' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// DELETE a module (only upcoming modules; cannot delete in_progress or completed)
const deleteModule = async (req, res) => {
  try {
    const mod = await CourseModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    if (mod.status !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot delete a started or completed module. Reset it first.' });
    }
    await mod.deleteOne();

    // Re-sequence orders for remaining modules
    const remaining = await CourseModule.find({ course_id: mod.course_id }).sort({ order: 1 });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].order = i + 1;
      await remaining[i].save();
    }

    res.json({ message: 'Module deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  getModulesByCourse, getAllModuleStats,
  addModule, updateModule, deleteModule,
  startModule, completeModule, resetModule, moveModule
};
