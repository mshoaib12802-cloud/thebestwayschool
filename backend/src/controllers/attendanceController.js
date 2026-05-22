const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const User = require('../models/User');
const Fine = require('../models/Fine');

// Creates absence fine for a student if not already created for that day
const autoAbsenceFine = async (studentDoc, date) => {
  if (!studentDoc || !studentDoc.absence_fine_amount) return;
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
  const exists = await Fine.findOne({
    student_id: studentDoc._id,
    category: 'absence',
    issued_date: { $gte: dayStart, $lte: dayEnd },
  });
  if (!exists) {
    await Fine.create({
      target_type: 'student',
      student_id: studentDoc._id,
      category: 'absence',
      reason: `Absent on ${new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      amount: studentDoc.absence_fine_amount,
      issued_date: date,
      notes: 'Auto-generated on attendance marking',
    });
  }
};

// @desc    1. Mark Attendance (Auto Scanner OR Manual Entry)
// @route   POST /api/attendance/mark
const markAttendance = async (req, res) => {
  try {
    const { qr_code, status, date } = req.body; 
    
    // Default values (Agar manual nahi to 'Present' aur 'Aaj' ki date)
    const markStatus = status || 'present';
    const markDate = date ? new Date(date) : new Date();

    let person = null;
    let personType = '';

    // 1. Search in Students (by QR or Roll No)
    person = await Student.findOne({ 
      $or: [{ qr_code: qr_code }, { roll_number: qr_code }] 
    });
    if (person) personType = 'Student';
    
    // 2. Search in Staff (by QR or Email or ID)
    if (!person) {
      person = await User.findOne({ 
        $or: [{ qr_code: qr_code }, { email: qr_code }] 
      });
      if (person) personType = 'User';
    }

    if (!person) return res.status(404).json({ message: 'User/Student Not Found' });

    // 3. Set Date Range for THAT specific day (Subah 00:00 se Raat 23:59 tak)
    const dayStart = new Date(markDate); 
    dayStart.setHours(0,0,0,0);
    
    const dayEnd = new Date(markDate); 
    dayEnd.setHours(23,59,59,999);

    // 4. Check if record exists for that day
    let attendance = await Attendance.findOne({
      person_id: person._id,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    if (attendance) {
      // CASE A: Record exists -> Update it (e.g., Manual correction or Check-out)

      // Agar status manually bhej rahay hain (e.g. 'absent' ya 'leave'), to update kardo
      if (status) {
        const wasAbsent = attendance.status === 'absent';
        attendance.status = status;
        await attendance.save();

        if (status === 'absent' && personType === 'Student') {
          await autoAbsenceFine(person, markDate);
        } else if (wasAbsent && status !== 'absent' && personType === 'Student') {
          // Absence corrected — remove the pending auto-fine for this day
          const dayStart = new Date(markDate); dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(markDate); dayEnd.setHours(23, 59, 59, 999);
          await Fine.findOneAndDelete({
            student_id: person._id,
            category: 'absence',
            status: 'pending',
            notes: { $regex: 'auto-generated', $options: 'i' },
            issued_date: { $gte: dayStart, $lte: dayEnd },
          });
        }

        return res.status(200).json({
          message: `Updated to ${status.toUpperCase()}`,
          name: person.name || person.full_name,
          type: 'Update'
        });
      }

      // Agar Scanner use ho raha hai aur banda pehle se present hai -> Check Out logic
      if (attendance.status === 'present' && !attendance.check_out_time) {
        attendance.check_out_time = new Date(); // Abhi ka time
        await attendance.save();
        return res.status(200).json({ 
          message: `Goodbye ${person.name || person.full_name}!`, 
          type: 'Check-Out', 
          name: person.name || person.full_name 
        });
      }

      return res.status(200).json({ message: 'Already Marked!', name: person.name || person.full_name });

    } else {
      // CASE B: New Entry -> Create Record
      await Attendance.create({
        person_id: person._id,
        person_type: personType,
        check_in_time: status ? null : new Date(),
        status: markStatus,
        date: markDate
      });

      // Auto-fine on new absent record for Student
      if (markStatus === 'absent' && personType === 'Student') {
        await autoAbsenceFine(person, markDate);
      }

      return res.status(201).json({
        message: `Marked as ${markStatus.toUpperCase()}`,
        type: 'Check-In',
        name: person.name || person.full_name
      });
    }

  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// @desc    2. Get Monthly Register Report (1-31 Days Table)
// @route   GET /api/attendance/report?month=1&year=2026
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if(!month || !year) return res.status(400).json({message: "Month and Year required"});

    // Calculate Start and End Date of Month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Get All Active Students
    const students = await Student.find({ isActive: true }).select('full_name roll_number');
    
    // 2. Get All Attendance Logs for this Month
    const logs = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
      person_type: 'Student'
    });

    // 3. Build the Report Structure
    const report = students.map(student => {
      // Filter logs for this specific student
      const studentLogs = logs.filter(l => l.person_id.toString() === student._id.toString());
      
      let days = {};
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      // Map logs to days (e.g., { 1: 'present', 5: 'absent' })
      studentLogs.forEach(log => {
        const day = new Date(log.date).getDate();
        days[day] = log.status;

        if(log.status === 'present' || log.status === 'late') presentCount++;
        else if(log.status === 'absent') absentCount++;
        else if(log.status === 'leave') leaveCount++;
      });

      const today = new Date();
      const isCurrentMonth = today.getFullYear() === Number(year) && (today.getMonth() + 1) === Number(month);
      const daysToCount = isCurrentMonth ? today.getDate() : new Date(Number(year), Number(month), 0).getDate();
      const percentage = daysToCount > 0 ? ((presentCount / daysToCount) * 100).toFixed(1) : 0;

      return {
        _id: student._id,
        name: student.full_name,
        roll_no: student.roll_number,
        attendance: days, // Object { 1: 'present', 2: 'absent'... }
        stats: {
          present: presentCount,
          absent: absentCount,
          leave: leaveCount,
          percentage: percentage + '%'
        }
      };
    });

    res.json(report);

  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// @desc    3. Get Daily Live Status (Today's List)
// @route   GET /api/attendance/status
const getDailyStatus = async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const students = await Student.find({ isActive: true }).select('full_name roll_number phone');
    const staff = await User.find({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }).select('name role phone email qr_code');

    const attendanceRecords = await Attendance.find({ date: { $gte: todayStart, $lte: todayEnd } });

    const fullList = [];

    students.forEach(std => {
      const record = attendanceRecords.find(a => a.person_id.toString() === std._id.toString());
      fullList.push({
        _id: std._id,
        name: std.full_name,
        role: 'Student',
        person_type: 'student',
        id_no: std.roll_number,
        identifier: std.roll_number,        // used by markAttendance as qr_code
        status: record ? record.status : null,  // null = not yet marked today
        check_in: record?.check_in_time || null,
        check_out: record?.check_out_time || null,
      });
    });

    staff.forEach(stf => {
      const record = attendanceRecords.find(a => a.person_id.toString() === stf._id.toString());
      fullList.push({
        _id: stf._id,
        name: stf.name,
        role: stf.role,
        person_type: 'staff',
        id_no: stf.email,
        identifier: stf.email || stf.qr_code, // used by markAttendance as qr_code
        status: record ? record.status : null,
        check_in: record?.check_in_time || null,
        check_out: record?.check_out_time || null,
      });
    });

    res.json(fullList);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    4. Quick Mark Leave Button
// @route   POST /api/attendance/leave
const markLeave = async (req, res) => {
  try {
    const { person_id, type } = req.body; 
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    
    // Use findOneAndUpdate with upsert to Create or Update
    await Attendance.findOneAndUpdate(
      { person_id: person_id, date: { $gte: todayStart } },
      { 
        person_type: type,
        status: 'leave',
        check_in_time: null,
        check_out_time: null,
        date: Date.now()
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Marked on Leave' });

  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    5. Get Staff Monthly Attendance Report
// @route   GET /api/attendance/staff-report?month=1&year=2026
const getStaffMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const staff = await User.find({ role: { $in: ['teacher', 'clerk', 'office_boy'] } }).select('name role qr_code');
    const logs = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
      person_type: 'User'
    });

    const report = staff.map(member => {
      const memberLogs = logs.filter(l => l.person_id.toString() === member._id.toString());
      let days = {}, presentCount = 0, absentCount = 0, leaveCount = 0;

      memberLogs.forEach(log => {
        const day = new Date(log.date).getDate();
        days[day] = log.status;
        if (log.status === 'present' || log.status === 'late') presentCount++;
        else if (log.status === 'absent') absentCount++;
        else if (log.status === 'leave') leaveCount++;
      });

      const today2 = new Date();
      const isCurrentMonth2 = today2.getFullYear() === Number(year) && (today2.getMonth() + 1) === Number(month);
      const daysToCount2 = isCurrentMonth2 ? today2.getDate() : new Date(Number(year), Number(month), 0).getDate();
      const percentage = daysToCount2 > 0 ? ((presentCount / daysToCount2) * 100).toFixed(1) : 0;

      return {
        _id: member._id,
        name: member.name,
        role: member.role,
        attendance: days,
        stats: { present: presentCount, absent: absentCount, leave: leaveCount, percentage: percentage + '%' }
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    6. Mark All Active Students Present for a Day
// @route   POST /api/attendance/mark-all
const markAllPresent = async (req, res) => {
  try {
    const { date } = req.body;
    const markDate = date ? new Date(date) : new Date();
    const dayStart = new Date(markDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(markDate); dayEnd.setHours(23, 59, 59, 999);

    const students = await Student.find({ isActive: true }).select('_id');
    let marked = 0;

    for (const student of students) {
      const exists = await Attendance.findOne({
        person_id: student._id,
        date: { $gte: dayStart, $lte: dayEnd }
      });
      if (!exists) {
        await Attendance.create({
          person_id: student._id,
          person_type: 'Student',
          check_in_time: new Date(),
          status: 'present',
          date: markDate
        });
        marked++;
      }
    }

    res.json({ message: `${marked} students marked present`, total: students.length, marked });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { markAttendance, getDailyStatus, getMonthlyReport, markLeave, getStaffMonthlyReport, markAllPresent };