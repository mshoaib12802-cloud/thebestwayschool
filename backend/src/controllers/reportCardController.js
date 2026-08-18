const ReportCard  = require('../models/ReportCard');
const Student     = require('../models/Student');
const Subject     = require('../models/Subject');
const MarksEntry  = require('../models/MarksEntry');

const getGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

const POP = [
  { path: 'student_id',      select: 'full_name roll_number photo' },
  { path: 'class_id',        select: 'name section grade_level' },
  { path: 'academic_year_id', select: 'label' },
];

const processMarks = (subject_marks) => {
  let total_obtained = 0, total_marks_sum = 0;
  const processed = (subject_marks || []).map(sm => {
    const obt  = Number(sm.obtained_marks) || 0;
    const tot  = Number(sm.total_marks)    || 100;
    const pass = Number(sm.passing_marks)  || Math.round(tot * 0.4);
    const pct  = tot > 0 ? (obt / tot) * 100 : 0;
    total_obtained  += obt;
    total_marks_sum += tot;
    return { ...sm, obtained_marks: obt, total_marks: tot, passing_marks: pass, grade: getGrade(pct), is_pass: obt >= pass };
  });
  const percentage = total_marks_sum > 0
    ? parseFloat(((total_obtained / total_marks_sum) * 100).toFixed(1))
    : 0;
  return { processed, total_obtained, total_marks_sum, percentage };
};

const recalcPositions = async (class_id, academic_year_id, term) => {
  const all = await ReportCard.find({ class_id, academic_year_id, term }).sort({ percentage: -1 });
  for (let i = 0; i < all.length; i++) {
    await ReportCard.findByIdAndUpdate(all[i]._id, { position: i + 1 });
  }
};

// ── GET ALL ───────────────────────────────────────────────────────────────────
const getReportCards = async (req, res) => {
  try {
    const filter = {};
    if (req.query.student_id)       filter.student_id      = req.query.student_id;
    if (req.query.class_id)         filter.class_id        = req.query.class_id;
    if (req.query.academic_year_id) filter.academic_year_id = req.query.academic_year_id;
    if (req.query.term)             filter.term            = req.query.term;
    const cards = await ReportCard.find(filter).populate(POP).sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── CREATE / UPSERT SINGLE ────────────────────────────────────────────────────
const addReportCard = async (req, res) => {
  try {
    const { student_id, academic_year_id, class_id, term, subject_marks, remarks } = req.body;
    const { processed, total_obtained, total_marks_sum, percentage } = processMarks(subject_marks);

    let card = await ReportCard.findOne({ student_id, academic_year_id, term });
    if (card) {
      Object.assign(card, {
        class_id, subject_marks: processed, total_obtained,
        total_marks: total_marks_sum, percentage,
        grade: getGrade(percentage), remarks: remarks || '',
      });
      await card.save();
    } else {
      card = await ReportCard.create({
        student_id, academic_year_id, class_id, term,
        subject_marks: processed, total_obtained,
        total_marks: total_marks_sum, percentage,
        grade: getGrade(percentage), remarks: remarks || '',
        created_by: req.user._id,
      });
    }

    await recalcPositions(class_id, academic_year_id, term);
    res.status(201).json(await ReportCard.findById(card._id).populate(POP));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// ── UPDATE SINGLE ─────────────────────────────────────────────────────────────
const updateReportCard = async (req, res) => {
  try {
    const card = await ReportCard.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Not found' });

    if (req.body.subject_marks !== undefined) {
      const { processed, total_obtained, total_marks_sum, percentage } = processMarks(req.body.subject_marks);
      card.subject_marks  = processed;
      card.total_obtained = total_obtained;
      card.total_marks    = total_marks_sum;
      card.percentage     = percentage;
      card.grade          = getGrade(percentage);
    }
    if (req.body.remarks !== undefined) card.remarks = req.body.remarks;
    await card.save();
    await recalcPositions(card.class_id, card.academic_year_id, card.term);
    res.json(await ReportCard.findById(card._id).populate(POP));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
const deleteReportCard = async (req, res) => {
  try {
    const card = await ReportCard.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Not found' });
    await ReportCard.findByIdAndDelete(req.params.id);
    await recalcPositions(card.class_id, card.academic_year_id, card.term);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── BULK GENERATE ─────────────────────────────────────────────────────────────
const bulkGenerate = async (req, res) => {
  try {
    const { class_id, academic_year_id, term } = req.body;
    if (!class_id || !academic_year_id || !term)
      return res.status(400).json({ message: 'class_id, academic_year_id, and term are required' });

    const students = await Student
      .find({ school_class_id: class_id, isActive: true })
      .select('_id full_name roll_number');
    if (!students.length)
      return res.status(400).json({ message: 'No active students found in this class' });

    const subjects = await Subject
      .find({ class_id, is_active: true })
      .select('_id name total_marks passing_marks');

    const entries = await MarksEntry
      .find({ class_id, academic_year_id, term })
      .select('subject_id total_marks passing_marks student_marks');

    // Build per-subject lookup: subjectId -> { name, total_marks, passing_marks, studentMarks }
    const subMap = {};
    subjects.forEach(s => {
      subMap[s._id.toString()] = {
        _id: s._id, name: s.name,
        total_marks: s.total_marks, passing_marks: s.passing_marks,
        studentMarks: {},
      };
    });
    entries.forEach(e => {
      const sid = e.subject_id.toString();
      if (!subMap[sid]) return; // skip entries without matching subject
      subMap[sid].total_marks   = e.total_marks;
      subMap[sid].passing_marks = e.passing_marks;
      e.student_marks.forEach(sm => {
        if (sm.student_id)
          subMap[sid].studentMarks[sm.student_id.toString()] = sm.is_absent ? 0 : (sm.obtained_marks ?? 0);
      });
    });

    const subList = Object.values(subMap);
    let count = 0;

    for (const student of students) {
      const subject_marks = subList.map(sub => ({
        subject_id:    sub._id,
        subject_name:  sub.name,
        obtained_marks: sub.studentMarks[student._id.toString()] ?? 0,
        total_marks:   sub.total_marks,
        passing_marks: sub.passing_marks,
      }));

      const { processed, total_obtained, total_marks_sum, percentage } = processMarks(subject_marks);

      let card = await ReportCard.findOne({ student_id: student._id, academic_year_id, term });
      if (card) {
        Object.assign(card, {
          class_id, subject_marks: processed, total_obtained,
          total_marks: total_marks_sum, percentage, grade: getGrade(percentage),
        });
        await card.save();
      } else {
        await ReportCard.create({
          student_id: student._id, academic_year_id, class_id, term,
          subject_marks: processed, total_obtained,
          total_marks: total_marks_sum, percentage,
          grade: getGrade(percentage), created_by: req.user._id,
        });
      }
      count++;
    }

    await recalcPositions(class_id, academic_year_id, term);
    res.json({ count, message: `${count} report card${count !== 1 ? 's' : ''} generated successfully` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getReportCards, addReportCard, updateReportCard, deleteReportCard, bulkGenerate };
