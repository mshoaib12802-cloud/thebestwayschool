const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('CHANGE_THIS')) {
  console.error('FATAL: JWT_SECRET is not set or is still the placeholder. Set it in .env before starting.');
  process.exit(1);
}

connectDB();

const app = express();

// Security headers
app.use(helmet());

// CORS — only allow the configured frontend origin
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// No-cache for API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Rate limiting on login — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter — 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Routes
const authRoutes          = require('./routes/authRoutes');
const visitorRoutes       = require('./routes/visitorRoutes');
const studentRoutes       = require('./routes/studentRoutes');
const financeRoutes       = require('./routes/financeRoutes');
const attendanceRoutes    = require('./routes/attendanceRoutes');
const staffRoutes         = require('./routes/staffRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const courseRoutes        = require('./routes/courseRoutes');
const examRoutes          = require('./routes/examRoutes');
const batchRoutes         = require('./routes/batchRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const fineRoutes          = require('./routes/fineRoutes');
const courseModuleRoutes  = require('./routes/courseModuleRoutes');
const teacherPortalRoutes = require('./routes/teacherPortalRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const dateSheetRoutes     = require('./routes/dateSheetRoutes');
const liveExamRoutes      = require('./routes/liveExamRoutes');
const messageRoutes       = require('./routes/messageRoutes');
const lmsRoutes           = require('./routes/lmsRoutes');
const schoolLmsRoutes     = require('./routes/schoolLmsRoutes');
const clientRoutes        = require('./routes/clientRoutes');
const clientPortalRoutes  = require('./routes/clientPortalRoutes');
const diaryRoutes         = require('./routes/diaryRoutes');
const analyticsRoutes     = require('./routes/analyticsRoutes');
const classRoutes         = require('./routes/classRoutes');
const subjectRoutes       = require('./routes/subjectRoutes');
const academicYearRoutes  = require('./routes/academicYearRoutes');
const reportCardRoutes    = require('./routes/reportCardRoutes');
const promotionRoutes     = require('./routes/promotionRoutes');
const parentRoutes        = require('./routes/parentRoutes');
const parentPortalRoutes  = require('./routes/parentPortalRoutes');
const periodRoutes         = require('./routes/periodRoutes');
const classTimetableRoutes = require('./routes/classTimetableRoutes');
const feeStructureRoutes   = require('./routes/feeStructureRoutes');
const assignmentRoutes     = require('./routes/assignmentRoutes');
const leaveRoutes          = require('./routes/leaveRoutes');
const announcementRoutes   = require('./routes/announcementRoutes');
const payrollRoutes        = require('./routes/payrollRoutes');
const eventRoutes          = require('./routes/eventRoutes');
const libraryRoutes        = require('./routes/libraryRoutes');
const conductRoutes        = require('./routes/conductRoutes');
const transportRoutes      = require('./routes/transportRoutes');
const marksEntryRoutes     = require('./routes/marksEntryRoutes');
const staffAdvanceRoutes   = require('./routes/staffAdvanceRoutes');
const seatingPlanRoutes    = require('./routes/seatingPlanRoutes');
const ptmRoutes            = require('./routes/ptmRoutes');
const rollNoSlipRoutes     = require('./routes/rollNoSlipRoutes');
const syllabusRoutes       = require('./routes/syllabusRoutes');
const bankQuestionRoutes   = require('./routes/bankQuestionRoutes');
const examPaperRoutes      = require('./routes/examPaperRoutes');
const reportingRoutes      = require('./routes/reportingRoutes');
const settingsRoutes       = require('./routes/settingsRoutes');
const documentRoutes       = require('./routes/documentRoutes');
const concessionRoutes     = require('./routes/concessionRoutes');
const homeworkRoutes       = require('./routes/homeworkRoutes');
const auditRoutes          = require('./routes/auditRoutes');
const complaintRoutes      = require('./routes/complaintRoutes');
const pushRoutes           = require('./routes/pushRoutes');
const aiRoutes             = require('./routes/aiRoutes');
const canteenRoutes        = require('./routes/canteenRoutes');

app.use('/api/auth',           loginLimiter, authRoutes);
app.use('/api/visitors',       visitorRoutes);
app.use('/api/students',       studentRoutes);
app.use('/api/finance',        financeRoutes);
app.use('/api/attendance',     attendanceRoutes);
app.use('/api/staff',          staffRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/courses',        courseRoutes);
app.use('/api/exams',          examRoutes);
app.use('/api/batches',        batchRoutes);
app.use('/api/student-portal', studentPortalRoutes);
app.use('/api/fines',          fineRoutes);
app.use('/api/course-modules', courseModuleRoutes);
app.use('/api/teacher-portal', teacherPortalRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/date-sheets',    dateSheetRoutes);
app.use('/api/live-exams',     liveExamRoutes);
app.use('/api/messages',       messageRoutes);
app.use('/api/lms',            lmsRoutes);
app.use('/api/school-lms',    schoolLmsRoutes);
app.use('/api/clients',        clientRoutes);
app.use('/api/client-portal',  clientPortalRoutes);
app.use('/api/school-classes', classRoutes);
app.use('/api/subjects',       subjectRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/report-cards',   reportCardRoutes);
app.use('/api/promotions',     promotionRoutes);
app.use('/api/parents',         parentRoutes);
app.use('/api/parent-portal',   parentPortalRoutes);
app.use('/api/periods',         periodRoutes);
app.use('/api/class-timetable', classTimetableRoutes);
app.use('/api/fee-structure',   feeStructureRoutes);
app.use('/api/assignments',     assignmentRoutes);
app.use('/api/leaves',          leaveRoutes);
app.use('/api/announcements',   announcementRoutes);
app.use('/api/payroll',         payrollRoutes);
app.use('/api/events',          eventRoutes);
app.use('/api/library',         libraryRoutes);
app.use('/api/conduct',         conductRoutes);
app.use('/api/transport',       transportRoutes);
app.use('/api/marks-entry',     marksEntryRoutes);
app.use('/api/staff-advances',  staffAdvanceRoutes);
app.use('/api/seating-plans',   seatingPlanRoutes);
app.use('/api/ptm',             ptmRoutes);
app.use('/api/roll-no-slips',   rollNoSlipRoutes);
app.use('/api/syllabus',        syllabusRoutes);
app.use('/api/bank-questions',  bankQuestionRoutes);
app.use('/api/exam-papers',     examPaperRoutes);
app.use('/api/reports',         reportingRoutes);
app.use('/api/settings',        settingsRoutes);
app.use('/api/documents',       documentRoutes);
app.use('/api/concessions',     concessionRoutes);
app.use('/api/homework',        homeworkRoutes);
app.use('/api/audit-logs',      auditRoutes);
app.use('/api/complaints',      complaintRoutes);
app.use('/api/diary',           diaryRoutes);
app.use('/api/analytics',       analyticsRoutes);
app.use('/api/push',            pushRoutes);
app.use('/api/ai',              aiRoutes);
app.use('/api/canteen',         canteenRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/documents', express.static(path.join(__dirname, '../uploads/documents')));
app.use('/uploads/settings',  express.static(path.join(__dirname, '../uploads/settings')));
app.use('/uploads/lms-pdfs',  express.static(path.join(__dirname, '../uploads/lms-pdfs')));

app.get('/', (req, res) => {
  res.json({ message: 'Inflorescence Advance Skills — API Running', status: 'ok' });
});

// 404
app.use((req, res, next) => {
  const error = new Error(`Not Found — ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});
