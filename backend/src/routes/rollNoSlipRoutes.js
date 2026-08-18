const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const Student      = require('../models/Student');
const SeatingPlan  = require('../models/SeatingPlan');

// GET /api/roll-no-slips/students?class_id=X&academic_year_id=Y
// Returns students with their seating info for slip generation
router.get('/students', protect, staffOnly, async (req, res) => {
  try {
    const { class_id, academic_year_id } = req.query;
    if (!class_id) return res.status(400).json({ message: 'class_id is required' });

    const filter = { school_class_id: class_id, isActive: true };
    if (academic_year_id) filter.academic_year_id = academic_year_id;

    const students = await Student.find(filter)
      .populate('school_class_id', 'name grade_level')
      .populate('academic_year_id', 'label')
      .sort({ roll_number: 1 })
      .lean();

    // pull seating plans for this class/year so we can attach seat numbers
    const seatFilter = { class_id };
    if (academic_year_id) seatFilter.academic_year_id = academic_year_id;
    const plans = await SeatingPlan.find(seatFilter).lean();

    // build map: student_id → { seat_no, room_name }
    const seatMap = {};
    plans.forEach(plan => {
      plan.seats.forEach(seat => {
        if (seat.student_id) {
          seatMap[seat.student_id.toString()] = {
            seat_no:   seat.seat_no || `R${seat.row_no}C${seat.column_no}`,
            room_name: plan.room_name,
            exam_label: plan.exam_label,
          };
        }
      });
    });

    const result = students.map(s => ({
      _id:           s._id,
      full_name:     s.full_name,
      father_name:   s.father_name,
      roll_number:   s.roll_number,
      photo:         s.photo || '',
      gender:        s.gender,
      blood_group:   s.blood_group,
      medium:        s.medium,
      subject_group: s.subject_group || 'None',
      section:       s.section,
      school_class:  s.school_class_id?.name || '',
      academic_year: s.academic_year_id?.label || '',
      seat_info:     seatMap[s._id.toString()] || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
