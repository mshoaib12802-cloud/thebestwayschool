const SeatingPlan = require('../models/SeatingPlan');
const Student     = require('../models/Student');
const SchoolClass = require('../models/SchoolClass');

// ── helpers ──────────────────────────────────────────────────────────────────
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const populateOpts = [
  { path: 'class_id',        select: 'name grade_level section' },
  { path: 'class_ids',       select: 'name grade_level section' },
  { path: 'academic_year_id', select: 'label' },
];

// ── GET ALL ───────────────────────────────────────────────────────────────────
const getSeatingPlans = async (req, res) => {
  try {
    const { class_id, academic_year_id } = req.query;
    const filter = {};
    if (class_id)        filter.class_id = class_id;
    if (academic_year_id) filter.academic_year_id = academic_year_id;

    const plans = await SeatingPlan.find(filter)
      .populate(populateOpts)
      .select('-seats')          // omit seats array for list view (performance)
      .sort({ createdAt: -1 });

    res.json(plans);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
const createSeatingPlan = async (req, res) => {
  try {
    const {
      class_id, class_ids,
      academic_year_id,
      rows, columns,
      exam_label, room_name, date,
      arrangement = 'sequential',
    } = req.body;

    // Resolve which classes to include
    const allClassIds = Array.isArray(class_ids) && class_ids.length
      ? class_ids
      : class_id ? [class_id] : [];

    if (!allClassIds.length)
      return res.status(400).json({ message: 'Select at least one class' });

    // Fetch students from all selected classes
    let students = [];
    const classMap = {};

    for (const cid of allClassIds) {
      const cls = await SchoolClass.findById(cid).select('name grade_level section');
      if (cls) classMap[String(cid)] = cls.name || `Grade ${cls.grade_level} ${cls.section || ''}`.trim();

      const query = { school_class_id: cid, isActive: true };
      if (academic_year_id) query.academic_year_id = academic_year_id;

      const classStudents = await Student
        .find(query)
        .select('full_name roll_number school_class_id')
        .sort({ roll_number: 1 });

      students.push(...classStudents.map(s => ({
        ...s.toObject(),
        class_name: classMap[String(cid)] || '',
      })));
    }

    // Apply arrangement
    let ordered = students;
    if (arrangement === 'random') {
      ordered = shuffle(students);
    } else if (arrangement === 'sequential') {
      // already sorted by roll_number per class; for multi-class, sort globally
      ordered = students.sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || '', undefined, { numeric: true }));
    }
    // serpentine and column_wise use the same student order but differ in layout

    // Build seat grid
    const totalRows = parseInt(rows);
    const totalCols = parseInt(columns);
    const seats = [];
    let idx = 0;

    if (arrangement === 'column_wise') {
      for (let c = 1; c <= totalCols; c++) {
        for (let r = 1; r <= totalRows; r++) {
          const s = ordered[idx++] || null;
          seats.push({ student_id: s?._id || null, student_name: s?.full_name || '', roll_number: s?.roll_number || '', class_name: s?.class_name || '', seat_no: `R${r}C${c}`, row_no: r, column_no: c });
        }
      }
    } else {
      for (let r = 1; r <= totalRows; r++) {
        const isReverse = arrangement === 'serpentine' && r % 2 === 0;
        const colOrder = isReverse
          ? Array.from({ length: totalCols }, (_, i) => totalCols - i)
          : Array.from({ length: totalCols }, (_, i) => i + 1);

        for (const c of colOrder) {
          const s = ordered[idx++] || null;
          seats.push({ student_id: s?._id || null, student_name: s?.full_name || '', roll_number: s?.roll_number || '', class_name: s?.class_name || '', seat_no: `R${r}C${c}`, row_no: r, column_no: c });
        }
      }
    }

    const plan = await SeatingPlan.create({
      class_id: allClassIds[0],
      class_ids: allClassIds,
      academic_year_id: academic_year_id || null,
      rows: totalRows,
      columns: totalCols,
      exam_label,
      room_name,
      date: date || null,
      arrangement,
      seats,
      students_count: students.length,
      created_by: req.user._id,
    });

    await plan.populate(populateOpts);
    res.status(201).json(plan);
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }); }
};

// ── GET ONE ───────────────────────────────────────────────────────────────────
const getSeatingPlan = async (req, res) => {
  try {
    const plan = await SeatingPlan.findById(req.params.id).populate(populateOpts);
    if (!plan) return res.status(404).json({ message: 'Not found' });
    res.json(plan);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
const deleteSeatingPlan = async (req, res) => {
  try {
    await SeatingPlan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── RESHUFFLE ─────────────────────────────────────────────────────────────────
const reshuffleSeatingPlan = async (req, res) => {
  try {
    const plan = await SeatingPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Not found' });

    const occupied = plan.seats.filter(s => s.student_id);
    const shuffled = shuffle(occupied.map(s => ({
      student_id: s.student_id, student_name: s.student_name,
      roll_number: s.roll_number, class_name: s.class_name,
    })));

    let idx = 0;
    plan.seats = plan.seats.map(s => {
      if (!s.student_id) return s;
      const reassigned = shuffled[idx++];
      return { ...s.toObject(), ...reassigned };
    });

    await plan.save();
    await plan.populate(populateOpts);
    res.json(plan);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getSeatingPlans, createSeatingPlan, getSeatingPlan, deleteSeatingPlan, reshuffleSeatingPlan };
