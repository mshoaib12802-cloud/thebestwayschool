/**
 * seedAll.js — Complete test-data seed for Inflorescence Institute ERP
 *
 * Run:  node src/seedAll.js
 *
 * What it creates (idempotent — safe to run multiple times):
 *   • Admin user (resets password to Admin@1234)
 *   • 3 Teachers
 *   • 1 Academic Year (2025-2026, current)
 *   • 3 Classes (Class 1-A, Class 2-A, Class 3-A)
 *   • 5 Subjects per class
 *   • 4 Fee Heads
 *   • 10 Students (with portal User accounts)
 *   • Fee Invoices for Jan–Apr 2026 (mix of paid / unpaid)
 *   • Attendance records for last 14 days
 *   • 8 Periods (7 class + 1 lunch break)
 *   • Class Timetable for all 3 classes, Mon–Fri
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Models ────────────────────────────────────────────────────────────────────
const User           = require('./models/User');
const Student        = require('./models/Student');
const AcademicYear   = require('./models/AcademicYear');
const SchoolClass    = require('./models/SchoolClass');
const Subject        = require('./models/Subject');
const FeeHead        = require('./models/FeeHead');
const FeeInvoice     = require('./models/FeeInvoice');
const Attendance     = require('./models/Attendance');
const Period         = require('./models/Period');
const ClassTimetable = require('./models/ClassTimetable');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/institute_erp';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── 1. Admin ──────────────────────────────────────────────────────────────
  console.log('👤 Setting up admin...');
  const adminPwd = process.env.ADMIN_SEED_PASSWORD || 'Admin@1234';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@inflorescence.com';
  const adminHash = await hashPassword(adminPwd);

  let admin = await User.findOne({ role: 'admin' });
  if (admin) {
    await User.updateOne({ _id: admin._id }, { password: adminHash, email: adminEmail });
    console.log(`   Updated  : ${adminEmail}`);
  } else {
    admin = await User.create({
      name: 'System Admin',
      email: adminEmail,
      password: adminPwd,
      role: 'admin',
      joining_date: new Date(),
    });
    console.log(`   Created  : ${adminEmail}`);
  }
  admin = await User.findOne({ role: 'admin' });

  // ── 2. Teachers ───────────────────────────────────────────────────────────
  console.log('\n👨‍🏫 Setting up teachers...');
  const teacherData = [
    { name: 'Ali Hassan',    email: 'ali.teacher@inflorescence.com',    salary: 35000 },
    { name: 'Fatima Khan',   email: 'fatima.teacher@inflorescence.com', salary: 32000 },
    { name: 'Usman Tariq',   email: 'usman.teacher@inflorescence.com',  salary: 30000 },
  ];
  const teacherPwd = 'Teacher@123';
  const teacherHash = await hashPassword(teacherPwd);
  const teachers = [];

  for (const td of teacherData) {
    let t = await User.findOne({ email: td.email });
    if (!t) {
      t = await User.create({
        name: td.name,
        email: td.email,
        password: teacherPwd,
        role: 'teacher',
        salary_type: 'monthly',
        salary_amount: td.salary,
        joining_date: new Date('2024-01-01'),
      });
      console.log(`   Created  : ${td.name} (${td.email})`);
    } else {
      await User.updateOne({ _id: t._id }, { password: teacherHash });
      console.log(`   Updated  : ${td.name} (${td.email})`);
      t = await User.findOne({ email: td.email });
    }
    teachers.push(t);
  }

  // ── 3. Academic Year ──────────────────────────────────────────────────────
  console.log('\n📅 Setting up academic year...');
  let academicYear = await AcademicYear.findOne({ label: '2025-2026' });
  if (!academicYear) {
    academicYear = await AcademicYear.create({
      label: '2025-2026',
      start_date: new Date('2025-04-01'),
      end_date: new Date('2026-03-31'),
      is_current: true,
      terms: [
        { name: 'Term 1', start_date: new Date('2025-04-01'), end_date: new Date('2025-08-31') },
        { name: 'Term 2', start_date: new Date('2025-09-01'), end_date: new Date('2026-01-31') },
        { name: 'Term 3', start_date: new Date('2026-02-01'), end_date: new Date('2026-03-31') },
      ],
    });
    console.log('   Created  : 2025-2026 (current)');
  } else {
    await AcademicYear.updateOne({ _id: academicYear._id }, { is_current: true });
    console.log('   Exists   : 2025-2026 (current)');
  }

  // Ensure only this year is current
  await AcademicYear.updateMany(
    { _id: { $ne: academicYear._id } },
    { is_current: false }
  );

  // ── 4. Classes ────────────────────────────────────────────────────────────
  console.log('\n🏫 Setting up classes...');
  const classData = [
    { name: 'Class 1', section: 'A', grade_level: 1, teacher: teachers[0] },
    { name: 'Class 2', section: 'A', grade_level: 2, teacher: teachers[1] },
    { name: 'Class 3', section: 'A', grade_level: 3, teacher: teachers[2] },
  ];
  const classes = [];

  for (const cd of classData) {
    let cls = await SchoolClass.findOne({ name: cd.name, section: cd.section });
    if (!cls) {
      cls = await SchoolClass.create({
        name: cd.name,
        section: cd.section,
        grade_level: cd.grade_level,
        class_teacher: cd.teacher._id,
        academic_year: academicYear._id,
        capacity: 30,
        room: `Room ${cd.grade_level}0${cd.grade_level}`,
        is_active: true,
      });
      console.log(`   Created  : ${cd.name}-${cd.section}`);
    } else {
      console.log(`   Exists   : ${cd.name}-${cd.section}`);
    }
    classes.push(cls);
  }

  // ── 5. Subjects ───────────────────────────────────────────────────────────
  console.log('\n📚 Setting up subjects...');
  const subjectNames = ['English', 'Mathematics', 'Science', 'Urdu', 'Islamiat'];

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    const teacher = teachers[i % teachers.length];
    for (const sname of subjectNames) {
      const exists = await Subject.findOne({ name: sname, class_id: cls._id });
      if (!exists) {
        await Subject.create({
          name: sname,
          code: sname.substring(0, 3).toUpperCase() + (i + 1),
          class_id: cls._id,
          teacher_id: teacher._id,
          total_marks: 100,
          passing_marks: 40,
          is_active: true,
        });
      }
    }
  }
  console.log('   Done');

  // ── 6. Fee Heads ──────────────────────────────────────────────────────────
  console.log('\n💰 Setting up fee heads...');
  const feeHeadData = [
    { name: 'Tuition Fee',   is_recurring: true },
    { name: 'Lab Fee',       is_recurring: true },
    { name: 'Admission Fee', is_recurring: false },
    { name: 'Sports Fee',    is_recurring: true },
  ];
  const feeHeads = [];

  for (const fh of feeHeadData) {
    let head = await FeeHead.findOne({ name: fh.name });
    if (!head) {
      head = await FeeHead.create({
        name: fh.name,
        is_recurring: fh.is_recurring,
        is_active: true,
        created_by: admin._id,
      });
      console.log(`   Created  : ${fh.name}`);
    } else {
      console.log(`   Exists   : ${fh.name}`);
    }
    feeHeads.push(head);
  }

  // ── 7. Students ───────────────────────────────────────────────────────────
  console.log('\n🎓 Setting up students...');

  const studentData = [
    // Class 1
    { name: 'Ahmed Raza',       roll: 'STU-001', class: 0, gender: 'male',   father: 'Raza Ali',       phone: '0300-1111111', dob: '2016-03-15' },
    { name: 'Sara Malik',       roll: 'STU-002', class: 0, gender: 'female', father: 'Malik Usman',    phone: '0300-2222222', dob: '2016-07-22' },
    { name: 'Bilal Ahmed',      roll: 'STU-003', class: 0, gender: 'male',   father: 'Ahmed Khan',     phone: '0300-3333333', dob: '2016-11-05' },
    // Class 2
    { name: 'Zainab Fatima',    roll: 'STU-004', class: 1, gender: 'female', father: 'Fatima Noor',    phone: '0300-4444444', dob: '2015-01-18' },
    { name: 'Hassan Ali',       roll: 'STU-005', class: 1, gender: 'male',   father: 'Ali Hussain',    phone: '0300-5555555', dob: '2015-06-30' },
    { name: 'Ayesha Siddiqui',  roll: 'STU-006', class: 1, gender: 'female', father: 'Siddiqui Babar', phone: '0300-6666666', dob: '2015-09-14' },
    // Class 3
    { name: 'Omar Farooq',      roll: 'STU-007', class: 2, gender: 'male',   father: 'Farooq Ahmad',   phone: '0300-7777777', dob: '2014-04-25' },
    { name: 'Nadia Hussain',    roll: 'STU-008', class: 2, gender: 'female', father: 'Hussain Tariq',  phone: '0300-8888888', dob: '2014-12-10' },
    { name: 'Kamran Iqbal',     roll: 'STU-009', class: 2, gender: 'male',   father: 'Iqbal Mansoor',  phone: '0300-9999999', dob: '2014-08-03' },
    { name: 'Hira Baig',        roll: 'STU-010', class: 0, gender: 'female', father: 'Baig Zafar',     phone: '0301-1010101', dob: '2016-02-28' },
  ];

  const studentPwd = 'Student@123';
  const studentHash = await hashPassword(studentPwd);
  const createdStudents = [];

  for (const sd of studentData) {
    let student = await Student.findOne({ roll_number: sd.roll });
    const cls = classes[sd.class];

    if (!student) {
      const emailSafe = sd.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
      const studentEmail = `${emailSafe}@student.inflorescence.com`;

      // Create portal User first
      let portalUser = await User.findOne({ email: studentEmail });
      if (!portalUser) {
        portalUser = await User.create({
          name: sd.name,
          email: studentEmail,
          password: studentPwd,
          role: 'student',
          joining_date: new Date(sd.dob),
        });
      } else {
        await User.updateOne({ _id: portalUser._id }, { password: studentHash });
        portalUser = await User.findOne({ email: studentEmail });
      }

      student = await Student.create({
        full_name: sd.name,
        roll_number: sd.roll,
        gender: sd.gender,
        dob: new Date(sd.dob),
        phone: sd.phone,
        father_name: sd.father,
        father_phone: sd.phone,
        school_class_id: cls._id,
        section: cls.section,
        academic_year_id: academicYear._id,
        admission_date: new Date('2025-04-01'),
        isActive: true,
        user_id: portalUser._id,
        address: 'Lahore, Pakistan',
        city: 'Lahore',
        nationality: 'Pakistani',
        religion: 'Islam',
        medium: 'English',
      });

      await User.updateOne({ _id: portalUser._id }, { student_id: student._id });
      console.log(`   Created  : ${sd.name} (${sd.roll}) → ${cls.name}-${cls.section}`);
    } else {
      console.log(`   Exists   : ${sd.name} (${sd.roll})`);
    }

    createdStudents.push(await Student.findOne({ roll_number: sd.roll }));
  }

  // ── 8. Fee Invoices ───────────────────────────────────────────────────────
  console.log('\n🧾 Setting up fee invoices...');

  const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
  // paid pattern: index 0..6 pay months 0..2, index 7..9 pay only month 0
  // Gives mix of fully-paid, partially-paid, unpaid

  const tuitionHead  = feeHeads[0];
  const labHead      = feeHeads[1];
  const admissionHead= feeHeads[2];
  const sportsHead   = feeHeads[3];

  let invoiceCount = 0;

  for (let si = 0; si < createdStudents.length; si++) {
    const student = createdStudents[si];

    for (let mi = 0; mi < months.length; mi++) {
      const month = months[mi];
      const isPaid   = si < 7 && mi < 3;   // students 0-6 paid for Jan-Mar
      const isPartial = si === 4 && mi === 3; // Hassan Ali partial for April

      const items = [
        {
          fee_head_id: tuitionHead._id,
          fee_head_name: 'Tuition Fee',
          amount: 3000,
          is_paid: isPaid,
          paid_amount: isPaid ? 3000 : (isPartial ? 1500 : 0),
          paid_date: isPaid ? new Date(`${month}-10`) : null,
        },
        {
          fee_head_id: labHead._id,
          fee_head_name: 'Lab Fee',
          amount: 500,
          is_paid: isPaid,
          paid_amount: isPaid ? 500 : 0,
          paid_date: isPaid ? new Date(`${month}-10`) : null,
        },
        {
          fee_head_id: sportsHead._id,
          fee_head_name: 'Sports Fee',
          amount: 300,
          is_paid: isPaid,
          paid_amount: isPaid ? 300 : 0,
          paid_date: isPaid ? new Date(`${month}-10`) : null,
        },
      ];

      const totalAmount = 3800;
      const paidAmount  = items.reduce((s, it) => s + it.paid_amount, 0);
      const balance     = totalAmount - paidAmount;
      const status      = paidAmount === 0 ? 'unpaid' : paidAmount >= totalAmount ? 'paid' : 'partial';

      try {
        await FeeInvoice.findOneAndUpdate(
          { student_id: student._id, month, academic_year_id: academicYear._id },
          {
            student_id: student._id,
            class_id: student.school_class_id,
            academic_year_id: academicYear._id,
            month,
            items,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            balance,
            status,
            due_date: new Date(`${month}-05`),
            generated_by: admin._id,
          },
          { upsert: true, new: true }
        );
        invoiceCount++;
      } catch (e) {
        // unique index conflict on re-run — already exists
      }
    }
  }
  console.log(`   ${invoiceCount} invoices created/updated`);

  // ── 9. Attendance ─────────────────────────────────────────────────────────
  console.log('\n📋 Setting up attendance records...');

  let attCount = 0;
  // last 14 working days
  const attendanceDays = [];
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  let daysAdded = 0;
  while (daysAdded < 14) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      attendanceDays.push(new Date(d));
      daysAdded++;
    }
    d.setDate(d.getDate() - 1);
  }

  for (const student of createdStudents) {
    for (const day of attendanceDays) {
      // ~85% present, ~10% absent, ~5% late
      const r = Math.random();
      const status = r < 0.85 ? 'present' : r < 0.95 ? 'absent' : 'late';

      try {
        await Attendance.findOneAndUpdate(
          { person_id: student._id, date: day },
          {
            person_id: student._id,
            person_type: 'Student',
            date: day,
            status,
            method: 'manual',
            marked_by: admin._id,
          },
          { upsert: true }
        );
        attCount++;
      } catch (e) {
        // already exists
      }
    }
  }
  console.log(`   ${attCount} attendance records created/updated`);

  // ── 10. Teacher Attendance ────────────────────────────────────────────────
  console.log('\n👔 Setting up teacher attendance...');
  let tAttCount = 0;
  for (const teacher of teachers) {
    for (const day of attendanceDays) {
      const r = Math.random();
      const status = r < 0.92 ? 'present' : r < 0.97 ? 'absent' : 'late';
      try {
        await Attendance.findOneAndUpdate(
          { person_id: teacher._id, date: day },
          {
            person_id: teacher._id,
            person_type: 'User',
            date: day,
            status,
            method: 'manual',
            marked_by: admin._id,
          },
          { upsert: true }
        );
        tAttCount++;
      } catch (e) {
        // already exists
      }
    }
  }
  console.log(`   ${tAttCount} teacher attendance records created/updated`);

  // ── 11. Periods ───────────────────────────────────────────────────────────
  console.log('\n⏰ Setting up periods...');
  const periodDefs = [
    { name: 'Period 1', start_time: '08:00', end_time: '08:45', is_break: false, order: 1 },
    { name: 'Period 2', start_time: '08:45', end_time: '09:30', is_break: false, order: 2 },
    { name: 'Period 3', start_time: '09:30', end_time: '10:15', is_break: false, order: 3 },
    { name: 'Break',    start_time: '10:15', end_time: '10:35', is_break: true,  order: 4 },
    { name: 'Period 4', start_time: '10:35', end_time: '11:20', is_break: false, order: 5 },
    { name: 'Period 5', start_time: '11:20', end_time: '12:05', is_break: false, order: 6 },
    { name: 'Lunch',    start_time: '12:05', end_time: '12:40', is_break: true,  order: 7 },
    { name: 'Period 6', start_time: '12:40', end_time: '13:25', is_break: false, order: 8 },
  ];
  const periods = [];
  for (const pd of periodDefs) {
    let p = await Period.findOne({ name: pd.name, order: pd.order });
    if (!p) {
      p = await Period.create({ ...pd, is_active: true });
      console.log(`   Created  : ${pd.name} (${pd.start_time}–${pd.end_time})`);
    } else {
      console.log(`   Exists   : ${pd.name}`);
    }
    periods.push(p);
  }

  // ── 12. Class Timetable ───────────────────────────────────────────────────
  console.log('\n📅 Setting up class timetables...');

  // Get subjects per class
  const allSubjects = await Subject.find({ is_active: true });
  const subjectsByClass = {};
  allSubjects.forEach(s => {
    const cid = s.class_id.toString();
    if (!subjectsByClass[cid]) subjectsByClass[cid] = [];
    subjectsByClass[cid].push(s);
  });

  const classPeriods = periods.filter(p => !p.is_break); // only teaching periods
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let ttCount = 0;

  for (const cls of classes) {
    const clsSubjects = subjectsByClass[cls._id.toString()] || [];
    if (!clsSubjects.length) continue;

    for (const day of days) {
      for (let pi = 0; pi < classPeriods.length; pi++) {
        const period  = classPeriods[pi];
        // Rotate subjects across days/periods
        const subject = clsSubjects[(pi + days.indexOf(day) * 2) % clsSubjects.length];
        try {
          await ClassTimetable.findOneAndUpdate(
            {
              class_id: cls._id,
              academic_year_id: academicYear._id,
              day_of_week: day,
              period_id: period._id,
            },
            {
              class_id: cls._id,
              academic_year_id: academicYear._id,
              day_of_week: day,
              period_id: period._id,
              subject_id: subject._id,
              teacher_id: subject.teacher_id || null,
              room: `Room ${cls.grade_level}0${cls.grade_level}`,
            },
            { upsert: true }
          );
          ttCount++;
        } catch (e) { /* duplicate on re-run */ }
      }
    }
  }
  console.log(`   ${ttCount} timetable entries created/updated`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('   🎉  Seed Complete! Login Credentials');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  ADMIN');
  console.log(`    Email   : ${adminEmail}`);
  console.log(`    Password: ${adminPwd}`);
  console.log('');
  console.log('  TEACHERS (all same password)');
  for (const td of teacherData) {
    console.log(`    ${td.email}`);
  }
  console.log(`    Password: ${teacherPwd}`);
  console.log('');
  console.log('  STUDENTS (all same password)');
  for (const sd of studentData) {
    const emailSafe = sd.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
    console.log(`    ${emailSafe}@student.inflorescence.com`);
  }
  console.log(`    Password: ${studentPwd}`);
  console.log('');
  console.log('  FEE STATUS');
  console.log('    Students 1-7 : Paid for Jan, Feb, Mar 2026');
  console.log('    Student 5    : Partial payment for Apr 2026');
  console.log('    Students 8-10: Unpaid (Feb, Mar, Apr 2026)');
  console.log('');
  console.log('  PERIODS (8:00 AM – 1:25 PM)');
  console.log('    8 periods (6 teaching + 2 breaks)');
  console.log('    Timetable seeded for all 3 classes, Mon–Fri');
  console.log('═══════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seed error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
