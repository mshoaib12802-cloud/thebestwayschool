const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const User = require('../models/User');
const Fine = require('../models/Fine');

const autoAbsenceFine = async (studentDoc, date) => {
  if (!studentDoc || !studentDoc.absence_fine_amount) return;
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  const exists = await Fine.findOne({
    student_id: studentDoc._id, category: 'absence',
    issued_date: { $gte: dayStart, $lte: dayEnd },
  });
  if (!exists) {
    await Fine.create({
      target_type: 'student', student_id: studentDoc._id, category: 'absence',
      reason: `Absent on ${new Date(date).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}`,
      amount: studentDoc.absence_fine_amount, issued_date: date,
      notes: 'Auto-generated on attendance marking',
    });
  }
};

// 1. Mark single (QR / Manual)
const markAttendance = async (req, res) => {
  try {
    const { qr_code, status, date, method, note, late_minutes } = req.body;
    const markStatus = status || 'present';
    const markDate   = date ? new Date(date) : new Date();
    const markMethod = method || 'manual';

    let person = null, personType = '';

    person = await Student.findOne({ $or: [{ qr_code }, { roll_number: qr_code }] });
    if (person) personType = 'Student';

    if (!person) {
      person = await User.findOne({ $or: [{ qr_code }, { email: qr_code }] });
      if (person) personType = 'User';
    }

    if (!person) return res.status(404).json({ message: 'Person not found' });

    const dayStart = new Date(markDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(markDate); dayEnd.setHours(23, 59, 59, 999);

    let attendance = await Attendance.findOne({
      person_id: person._id,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    if (attendance) {
      if (status) {
        const wasAbsent = attendance.status === 'absent';
        attendance.status = status;
        attendance.method = markMethod;
        if (note !== undefined) attendance.note = note;
        if (late_minutes !== undefined) attendance.late_minutes = Number(late_minutes);
        if (status === 'present' || status === 'late') {
          attendance.check_in_time = attendance.check_in_time || new Date();
        }
        await attendance.save();
        if (status === 'absent' && personType === 'Student') await autoAbsenceFine(person, markDate);
        else if (wasAbsent && status !== 'absent' && personType === 'Student') {
          await Fine.findOneAndDelete({
            student_id: person._id, category: 'absence', status: 'pending',
            issued_date: { $gte: dayStart, $lte: dayEnd },
          });
        }
        return res.json({ message: `Updated to ${status.toUpperCase()}`, name: person.name || person.full_name, type: 'Update' });
      }
      if (attendance.status === 'present' && !attendance.check_out_time) {
        attendance.check_out_time = new Date();
        await attendance.save();
        return res.json({ message: `Goodbye ${person.name || person.full_name}!`, type: 'Check-Out', name: person.name || person.full_name });
      }
      return res.json({ message: 'Already Marked!', name: person.name || person.full_name });
    } else {
      const checkIn = (markStatus === 'present' || markStatus === 'late') ? new Date() : null;
      await Attendance.create({
        person_id: person._id, person_type: personType,
        check_in_time: status ? checkIn : new Date(),
        status: markStatus, date: markDate, method: markMethod,
        note: note || '', late_minutes: late_minutes ? Number(late_minutes) : 0,
        marked_by: req.user?._id || null,
      });
      if (markStatus === 'absent' && personType === 'Student') await autoAbsenceFine(person, markDate);
      return res.status(201).json({
        message: `Marked as ${markStatus.toUpperCase()}`,
        type: 'Check-In', name: person.name || person.full_name,
        photo: person.photo || null,
      });
    }
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 2. Monthly student register
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year, class_id, section } = req.query;
    if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const filter = { isActive: true };
    if (class_id) filter.school_class_id = class_id;
    if (section)  filter.section = section;

    const students = await Student.find(filter).select('full_name roll_number school_class_id section photo');
    const logs = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }, person_type: 'Student'
    });

    const report = students.map(student => {
      const studentLogs = logs.filter(l => l.person_id.toString() === student._id.toString());
      let days = {}, presentCount = 0, absentCount = 0, leaveCount = 0, lateCount = 0;

      studentLogs.forEach(log => {
        const day = new Date(log.date).getDate();
        days[day] = log.status;
        if (log.status === 'present') presentCount++;
        else if (log.status === 'late')  { presentCount++; lateCount++; }
        else if (log.status === 'absent') absentCount++;
        else if (log.status === 'leave')  leaveCount++;
      });

      const today = new Date();
      const isCurrentMonth = today.getFullYear() === Number(year) && (today.getMonth() + 1) === Number(month);
      const daysToCount = isCurrentMonth ? today.getDate() : new Date(Number(year), Number(month), 0).getDate();
      const percentage = daysToCount > 0 ? ((presentCount / daysToCount) * 100).toFixed(1) : 0;

      return {
        _id: student._id, name: student.full_name, roll_no: student.roll_number,
        photo: student.photo || '',
        attendance: days,
        stats: { present: presentCount, absent: absentCount, leave: leaveCount, late: lateCount, percentage: percentage + '%' }
      };
    });

    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 3. Daily status
const getDailyStatus = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    const students = await Student.find({ isActive: true }).select('full_name roll_number phone photo school_class_id section');
    const staff    = await User.find({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }).select('name role phone email qr_code');
    const records  = await Attendance.find({ date: { $gte: dayStart, $lte: dayEnd } });

    const fullList = [];

    students.forEach(s => {
      const rec = records.find(a => a.person_id.toString() === s._id.toString());
      fullList.push({
        _id: s._id, name: s.full_name, role: 'Student', person_type: 'student',
        id_no: s.roll_number, identifier: s.roll_number,
        photo: s.photo || '', class_id: s.school_class_id, section: s.section,
        status: rec?.status || null, check_in: rec?.check_in_time || null,
        check_out: rec?.check_out_time || null, late_minutes: rec?.late_minutes || 0,
        method: rec?.method || null, note: rec?.note || '',
      });
    });

    staff.forEach(s => {
      const rec = records.find(a => a.person_id.toString() === s._id.toString());
      fullList.push({
        _id: s._id, name: s.name, role: s.role, person_type: 'staff',
        id_no: s.email, identifier: s.email || s.qr_code,
        photo: '', status: rec?.status || null,
        check_in: rec?.check_in_time || null, check_out: rec?.check_out_time || null,
        late_minutes: rec?.late_minutes || 0, method: rec?.method || null, note: rec?.note || '',
      });
    });

    res.json(fullList);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 4. Mark leave
const markLeave = async (req, res) => {
  try {
    const { person_id, type, date } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);

    await Attendance.findOneAndUpdate(
      { person_id, date: { $gte: dayStart } },
      { person_type: type, status: 'leave', check_in_time: null, check_out_time: null, date: targetDate, method: 'manual' },
      { upsert: true, new: true }
    );
    res.json({ message: 'Marked on Leave' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 5. Staff monthly report
const getStaffMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const staff = await User.find({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }).select('name role qr_code');
    const logs  = await Attendance.find({ date: { $gte: startDate, $lte: endDate }, person_type: 'User' });

    const report = staff.map(member => {
      const memberLogs = logs.filter(l => l.person_id.toString() === member._id.toString());
      let days = {}, presentCount = 0, absentCount = 0, leaveCount = 0, lateCount = 0;

      memberLogs.forEach(log => {
        const day = new Date(log.date).getDate();
        days[day] = { status: log.status, check_in: log.check_in_time, check_out: log.check_out_time, late_minutes: log.late_minutes };
        if (log.status === 'present') presentCount++;
        else if (log.status === 'late') { presentCount++; lateCount++; }
        else if (log.status === 'absent') absentCount++;
        else if (log.status === 'leave') leaveCount++;
      });

      const today = new Date();
      const isCurrentMonth = today.getFullYear() === Number(year) && (today.getMonth() + 1) === Number(month);
      const daysToCount = isCurrentMonth ? today.getDate() : new Date(Number(year), Number(month), 0).getDate();
      const percentage = daysToCount > 0 ? ((presentCount / daysToCount) * 100).toFixed(1) : 0;

      return {
        _id: member._id, name: member.name, role: member.role,
        attendance: days,
        stats: { present: presentCount, absent: absentCount, leave: leaveCount, late: lateCount, percentage: percentage + '%' }
      };
    });

    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 6. Mark all present
const markAllPresent = async (req, res) => {
  try {
    const { date, class_id } = req.body;
    const markDate = date ? new Date(date) : new Date();
    const dayStart = new Date(markDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(markDate); dayEnd.setHours(23, 59, 59, 999);

    const filter = { isActive: true };
    if (class_id) filter.school_class_id = class_id;

    const students = await Student.find(filter).select('_id');
    let marked = 0;

    for (const student of students) {
      const exists = await Attendance.findOne({ person_id: student._id, date: { $gte: dayStart, $lte: dayEnd } });
      if (!exists) {
        await Attendance.create({
          person_id: student._id, person_type: 'Student',
          check_in_time: new Date(), status: 'present', date: markDate, method: 'bulk_rollcall',
        });
        marked++;
      }
    }

    res.json({ message: `${marked} students marked present`, total: students.length, marked });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 7. Get class status for roll call
const getClassStatus = async (req, res) => {
  try {
    const { class_id, date, section } = req.query;
    if (!class_id) return res.status(400).json({ message: 'class_id required' });

    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    const filter = { school_class_id: class_id, isActive: true };
    if (section) filter.section = section;

    const students = await Student.find(filter)
      .select('full_name roll_number photo section subject_group gender')
      .sort({ roll_number: 1 });

    const records = await Attendance.find({
      person_type: 'Student',
      date: { $gte: dayStart, $lte: dayEnd },
      person_id: { $in: students.map(s => s._id) },
    });

    const result = students.map(s => {
      const rec = records.find(a => a.person_id.toString() === s._id.toString());
      return {
        _id: s._id, full_name: s.full_name, roll_number: s.roll_number,
        photo: s.photo || '', section: s.section, gender: s.gender,
        subject_group: s.subject_group,
        status: rec?.status || null,
        check_in: rec?.check_in_time || null,
        late_minutes: rec?.late_minutes || 0,
        note: rec?.note || '',
        attendance_id: rec?._id || null,
      };
    });

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 8. Bulk mark for roll call (entire class at once)
const bulkMarkAttendance = async (req, res) => {
  try {
    const { entries, date, method } = req.body;
    if (!entries || !Array.isArray(entries)) return res.status(400).json({ message: 'entries array required' });

    const markDate  = date ? new Date(date) : new Date();
    const dayStart  = new Date(markDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd    = new Date(markDate); dayEnd.setHours(23, 59, 59, 999);
    const markMethod = method || 'bulk_rollcall';

    const results = { saved: 0, updated: 0, errors: 0 };

    for (const entry of entries) {
      try {
        const { person_id, status, note, late_minutes } = entry;
        const checkIn = (status === 'present' || status === 'late') ? new Date() : null;

        const existing = await Attendance.findOne({
          person_id, date: { $gte: dayStart, $lte: dayEnd }
        });

        if (existing) {
          existing.status = status;
          existing.method = markMethod;
          if (note !== undefined) existing.note = note || '';
          if (late_minutes !== undefined) existing.late_minutes = Number(late_minutes) || 0;
          if (checkIn && !existing.check_in_time) existing.check_in_time = checkIn;
          await existing.save();
          results.updated++;
        } else {
          await Attendance.create({
            person_id, person_type: 'Student',
            status, date: markDate, method: markMethod,
            check_in_time: checkIn,
            note: note || '', late_minutes: Number(late_minutes) || 0,
            marked_by: req.user?._id || null,
          });
          results.saved++;
        }

        if (status === 'absent') {
          const student = await Student.findById(person_id).select('absence_fine_amount');
          if (student) await autoAbsenceFine(student, markDate);
        }
      } catch { results.errors++; }
    }

    res.json({ message: `Attendance saved: ${results.saved} new, ${results.updated} updated`, ...results });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 9. Defaulter report — students below attendance threshold
const getDefaulters = async (req, res) => {
  try {
    const { threshold = 75, class_id, month, year } = req.query;
    const thresholdNum = Number(threshold);

    const now = new Date();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    const targetYear  = year  ? Number(year)  : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate   = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const filter = { isActive: true };
    if (class_id) filter.school_class_id = class_id;

    const students = await Student.find(filter)
      .select('full_name roll_number photo school_class_id section')
      .populate('school_class_id', 'name');

    const logs = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }, person_type: 'Student',
      person_id: { $in: students.map(s => s._id) },
    });

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === targetYear && (today.getMonth() + 1) === targetMonth;
    const totalDays = isCurrentMonth ? today.getDate() : new Date(targetYear, targetMonth, 0).getDate();

    const defaulters = [];

    students.forEach(student => {
      const studentLogs = logs.filter(l => l.person_id.toString() === student._id.toString());
      const presentDays = studentLogs.filter(l => l.status === 'present' || l.status === 'late').length;
      const absentDays  = studentLogs.filter(l => l.status === 'absent').length;
      const percentage  = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      if (percentage < thresholdNum) {
        defaulters.push({
          _id: student._id, full_name: student.full_name, roll_number: student.roll_number,
          photo: student.photo || '', class_name: student.school_class_id?.name || '—',
          section: student.section, present: presentDays, absent: absentDays,
          total: totalDays, percentage: percentage.toFixed(1),
        });
      }
    });

    defaulters.sort((a, b) => Number(a.percentage) - Number(b.percentage));
    res.json(defaulters);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  markAttendance, getDailyStatus, getMonthlyReport, markLeave,
  getStaffMonthlyReport, markAllPresent,
  getClassStatus, bulkMarkAttendance, getDefaulters,
};
