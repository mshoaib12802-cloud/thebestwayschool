import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import Login from './pages/Login';
import StudentLogin from './pages/StudentLogin';
import TeacherLogin from './pages/TeacherLogin';
import Dashboard from './pages/Dashboard';
import Reception from './pages/Reception';
import Admissions from './pages/Admissions';
import Finance from './pages/Finance';
import Attendance from './pages/Attendance';
import Staff from './pages/Staff';
import Courses from './pages/Courses';
import Exams from './pages/Exams';
import LiveExams from './pages/LiveExams';
import Timetable from './pages/Timetable';
import OnlineAdmission from './pages/OnlineAdmission';
import AdmissionRequests from './pages/AdmissionRequests';
import Fines from './pages/Fines';
import DateSheet from './pages/DateSheet';

import StudentPortalLayout from './pages/student/StudentPortalLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourses from './pages/student/StudentCourses';
import StudentFees from './pages/student/StudentFees';
import StudentResults from './pages/student/StudentResults';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentFines from './pages/student/StudentFines';
import StudentModules from './pages/student/StudentModules';
import StudentLiveExam from './pages/student/StudentLiveExam';

import TeacherPortalLayout from './pages/teacher/TeacherPortalLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherCourses from './pages/teacher/TeacherCourses';
import TeacherExams from './pages/teacher/TeacherExams';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherProfile from './pages/teacher/TeacherProfile';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherTimetable from './pages/teacher/TeacherTimetable';
import TeacherLiveExams from './pages/teacher/TeacherLiveExams';
import StudentProfile from './pages/student/StudentProfile';
import StudentDateSheet from './pages/student/StudentDateSheet';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentLMS from './pages/student/StudentLMS';
import TeacherLMS from './pages/teacher/TeacherLMS';
import SchoolStudentLMS from './pages/student/SchoolStudentLMS';
import SchoolTeacherLMS from './pages/teacher/SchoolTeacherLMS';

import ClientLogin from './pages/ClientLogin';
import Clients from './pages/Clients';
import ClientPortalLayout from './pages/client/ClientPortalLayout';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientProjects from './pages/client/ClientProjects';
import ClientInvoices from './pages/client/ClientInvoices';
import ClientMessages from './pages/client/ClientMessages';
import ClientProfile from './pages/client/ClientProfile';

import RollNoSlips from './pages/RollNoSlips';
import SyllabusPage from './pages/Syllabus';
import ExamPapers from './pages/ExamPapers';
import SchoolClasses from './pages/SchoolClasses';
import Subjects from './pages/Subjects';
import AcademicYears from './pages/AcademicYears';
import ReportCards from './pages/ReportCards';
import Promotions from './pages/Promotions';
import Parents from './pages/Parents';
import SchoolPeriods from './pages/SchoolPeriods';
import SchoolTimetableBuilder from './pages/SchoolTimetableBuilder';
import FeeStructure from './pages/FeeStructure';
import FeeInvoices from './pages/FeeInvoices';
import Announcements from './pages/Announcements';
import LeaveManagement from './pages/LeaveManagement';
import Payroll from './pages/Payroll';
import SchoolCalendar from './pages/SchoolCalendar';
import Library from './pages/Library';
import Conduct from './pages/Conduct';
import Transport from './pages/Transport';
import MarksEntry from './pages/MarksEntry';
import ExamSeating from './pages/ExamSeating';
import PTMSchedule from './pages/PTMSchedule';
import Certificates from './pages/Certificates';
import IDCards from './pages/IDCards';
import StaffAdvances from './pages/StaffAdvances';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import FeeConcess from './pages/FeeConcess';
import HomeworkDiary from './pages/HomeworkDiary';
import Diary from './pages/Diary';
import Analytics from './pages/Analytics';
import FinancialDashboard from './pages/FinancialDashboard';
import AuditLog from './pages/AuditLog';
import Complaints from './pages/Complaints';
import Settings from './pages/Settings';
import ParentLogin from './pages/ParentLogin';
import ParentPortalLayout from './pages/parent/ParentPortalLayout';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentAttendance from './pages/parent/ParentAttendance';
import ParentResults from './pages/parent/ParentResults';
import ParentFees from './pages/parent/ParentFees';
import ParentFines from './pages/parent/ParentFines';
import ParentProfile from './pages/parent/ParentProfile';
import ParentTimetable from './pages/parent/ParentTimetable';
import ParentAnnouncements from './pages/parent/ParentAnnouncements';
import ParentLeave from './pages/parent/ParentLeave';
import ParentConduct from './pages/parent/ParentConduct';
import ParentTransport from './pages/parent/ParentTransport';
import ParentPTM from './pages/parent/ParentPTM';
import ParentHomework from './pages/parent/ParentHomework';
import ParentComplaints from './pages/parent/ParentComplaints';
import ParentDiary from './pages/parent/ParentDiary';

import TeacherDiary from './pages/teacher/TeacherDiary';
import TeacherSyllabus from './pages/teacher/TeacherSyllabus';
import TeacherExamPaper from './pages/teacher/TeacherExamPaper';
import TeacherHomework from './pages/teacher/TeacherHomework';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherMarksEntry from './pages/teacher/TeacherMarksEntry';
import TeacherLeave from './pages/teacher/TeacherLeave';
import TeacherAnnouncements from './pages/teacher/TeacherAnnouncements';
import TeacherClassAttendance from './pages/teacher/TeacherClassAttendance';
import TeacherPTM from './pages/teacher/TeacherPTM';
import TeacherPayslip from './pages/teacher/TeacherPayslip';

import StudentDiary from './pages/student/StudentDiary';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentAnnouncements from './pages/student/StudentAnnouncements';
import StudentLeave from './pages/student/StudentLeave';
import StudentLibrary from './pages/student/StudentLibrary';
import StudentFeeInvoices from './pages/student/StudentFeeInvoices';
import StudentHomework from './pages/student/StudentHomework';
import StudentComplaints from './pages/student/StudentComplaints';
import StudentCanteen from './pages/student/StudentCanteen';
import ParentCanteen from './pages/parent/ParentCanteen';
import Canteen from './pages/Canteen';

const ADMIN_ROLES = ['admin', 'clerk', 'office_boy'];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/"               element={<HomePage />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/student-login"  element={<StudentLogin />} />
          <Route path="/teacher-login"  element={<TeacherLogin />} />
          <Route path="/client-login"   element={<ClientLogin />} />
          <Route path="/parent-login"   element={<ParentLogin />} />
          <Route path="/apply"          element={<OnlineAdmission />} />

          {/* Admin / Staff Routes */}
          <Route element={<ProtectedRoute roles={ADMIN_ROLES} />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reception" element={<Reception />} />
              <Route path="/admissions" element={<Admissions />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="/live-exams" element={<LiveExams />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/fines" element={<Fines />} />
              <Route path="/date-sheets" element={<DateSheet />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/admission-requests" element={<AdmissionRequests />} />
              <Route path="/school-classes" element={<SchoolClasses />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/academic-years" element={<AcademicYears />} />
              <Route path="/report-cards" element={<ReportCards />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/parents" element={<Parents />} />
              <Route path="/school-periods" element={<SchoolPeriods />} />
              <Route path="/school-timetable-builder" element={<SchoolTimetableBuilder />} />
              <Route path="/fee-structure"            element={<FeeStructure />} />
              <Route path="/fee-invoices"             element={<FeeInvoices />} />
              <Route path="/announcements"            element={<Announcements />} />
              <Route path="/leave-management"         element={<LeaveManagement />} />
              <Route path="/payroll"                  element={<Payroll />} />
              <Route path="/staff-advances"           element={<StaffAdvances />} />
              <Route path="/school-calendar"          element={<SchoolCalendar />} />
              <Route path="/library"                  element={<Library />} />
              <Route path="/conduct"                  element={<Conduct />} />
              <Route path="/transport"                element={<Transport />} />
              <Route path="/marks-entry"              element={<MarksEntry />} />
              <Route path="/exam-seating"             element={<ExamSeating />} />
              <Route path="/ptm-schedule"             element={<PTMSchedule />} />
              <Route path="/certificates"             element={<Certificates />} />
              <Route path="/id-cards"                 element={<IDCards />} />
              <Route path="/roll-no-slips"           element={<RollNoSlips />} />
              <Route path="/syllabus"               element={<SyllabusPage />} />
              <Route path="/exam-papers"            element={<ExamPapers />} />
              <Route path="/reports"                element={<Reports />} />
              <Route path="/documents"              element={<Documents />} />
              <Route path="/fee-concessions"        element={<FeeConcess />} />
              <Route path="/homework-diary"         element={<HomeworkDiary />} />
              <Route path="/diary"                  element={<Diary />} />
              <Route path="/analytics"              element={<Analytics />} />
              <Route path="/financial-dashboard"   element={<FinancialDashboard />} />
              <Route path="/audit-log"              element={<AuditLog />} />
              <Route path="/complaints"             element={<Complaints />} />
              <Route path="/settings"               element={<Settings />} />
              <Route path="/canteen"                element={<Canteen />} />
            </Route>
          </Route>

          {/* Teacher Portal Routes */}
          <Route element={<ProtectedRoute roles={['teacher']} />}>
            <Route element={<TeacherPortalLayout />}>
              <Route path="/teacher-portal" element={<Navigate to="/teacher-portal/dashboard" replace />} />
              <Route path="/teacher-portal/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher-portal/courses" element={<TeacherCourses />} />
              <Route path="/teacher-portal/students" element={<TeacherStudents />} />
              <Route path="/teacher-portal/exams" element={<TeacherExams />} />
              <Route path="/teacher-portal/live-exams" element={<TeacherLiveExams />} />
              <Route path="/teacher-portal/attendance" element={<TeacherAttendance />} />
              <Route path="/teacher-portal/profile" element={<TeacherProfile />} />
              <Route path="/teacher-portal/timetable" element={<TeacherTimetable />} />
              <Route path="/teacher-portal/lms"              element={<TeacherLMS />} />
              <Route path="/teacher-portal/school-lms"       element={<SchoolTeacherLMS />} />
              <Route path="/teacher-portal/assignments"      element={<TeacherAssignments />} />
              <Route path="/teacher-portal/marks-entry"      element={<TeacherMarksEntry />} />
              <Route path="/teacher-portal/class-attendance" element={<TeacherClassAttendance />} />
              <Route path="/teacher-portal/announcements"    element={<TeacherAnnouncements />} />
              <Route path="/teacher-portal/ptm"              element={<TeacherPTM />} />
              <Route path="/teacher-portal/leave"            element={<TeacherLeave />} />
              <Route path="/teacher-portal/payslip"          element={<TeacherPayslip />} />
              <Route path="/teacher-portal/syllabus"         element={<TeacherSyllabus />} />
              <Route path="/teacher-portal/exam-paper"       element={<TeacherExamPaper />} />
              <Route path="/teacher-portal/homework"         element={<TeacherHomework />} />
              <Route path="/teacher-portal/diary"            element={<TeacherDiary />} />
            </Route>
          </Route>

          {/* Student Portal Routes */}
          <Route element={<ProtectedRoute roles={['student']} />}>
            <Route element={<StudentPortalLayout />}>
              <Route path="/student-portal" element={<Navigate to="/student-portal/dashboard" replace />} />
              <Route path="/student-portal/dashboard" element={<StudentDashboard />} />
              <Route path="/student-portal/courses" element={<StudentCourses />} />
              <Route path="/student-portal/modules" element={<StudentModules />} />
              <Route path="/student-portal/fees" element={<StudentFees />} />
              <Route path="/student-portal/results" element={<StudentResults />} />
              <Route path="/student-portal/attendance" element={<StudentAttendance />} />
              <Route path="/student-portal/fines" element={<StudentFines />} />
              <Route path="/student-portal/profile" element={<StudentProfile />} />
              <Route path="/student-portal/date-sheets" element={<StudentDateSheet />} />
              <Route path="/student-portal/timetable" element={<StudentTimetable />} />
              <Route path="/student-portal/live-exams" element={<StudentLiveExam />} />
              <Route path="/student-portal/lms"           element={<StudentLMS />} />
              <Route path="/student-portal/school-lms"    element={<SchoolStudentLMS />} />
              <Route path="/student-portal/assignments"   element={<StudentAssignments />} />
              <Route path="/student-portal/announcements" element={<StudentAnnouncements />} />
              <Route path="/student-portal/leave"         element={<StudentLeave />} />
              <Route path="/student-portal/library"       element={<StudentLibrary />} />
              <Route path="/student-portal/fee-invoices"  element={<StudentFeeInvoices />} />
              <Route path="/student-portal/homework"      element={<StudentHomework />} />
              <Route path="/student-portal/diary"         element={<StudentDiary />} />
              <Route path="/student-portal/complaints"    element={<StudentComplaints />} />
              <Route path="/student-portal/canteen"       element={<StudentCanteen />} />
            </Route>
          </Route>

          {/* Client Portal Routes */}
          <Route element={<ProtectedRoute roles={['client']} />}>
            <Route element={<ClientPortalLayout />}>
              <Route path="/client-portal" element={<Navigate to="/client-portal/dashboard" replace />} />
              <Route path="/client-portal/dashboard" element={<ClientDashboard />} />
              <Route path="/client-portal/projects"  element={<ClientProjects />} />
              <Route path="/client-portal/invoices"  element={<ClientInvoices />} />
              <Route path="/client-portal/messages"  element={<ClientMessages />} />
              <Route path="/client-portal/profile"   element={<ClientProfile />} />
            </Route>
          </Route>

          {/* Parent Portal Routes */}
          <Route element={<ProtectedRoute roles={['parent']} />}>
            <Route element={<ParentPortalLayout />}>
              <Route path="/parent-portal" element={<Navigate to="/parent-portal/dashboard" replace />} />
              <Route path="/parent-portal/dashboard"  element={<ParentDashboard />} />
              <Route path="/parent-portal/attendance" element={<ParentAttendance />} />
              <Route path="/parent-portal/results"    element={<ParentResults />} />
              <Route path="/parent-portal/fees"       element={<ParentFees />} />
              <Route path="/parent-portal/fines"      element={<ParentFines />} />
              <Route path="/parent-portal/profile"    element={<ParentProfile />} />
              <Route path="/parent-portal/timetable"     element={<ParentTimetable />} />
              <Route path="/parent-portal/announcements" element={<ParentAnnouncements />} />
              <Route path="/parent-portal/leave"         element={<ParentLeave />} />
              <Route path="/parent-portal/conduct"       element={<ParentConduct />} />
              <Route path="/parent-portal/transport"     element={<ParentTransport />} />
              <Route path="/parent-portal/ptm"           element={<ParentPTM />} />
              <Route path="/parent-portal/homework"      element={<ParentHomework />} />
              <Route path="/parent-portal/diary"         element={<ParentDiary />} />
              <Route path="/parent-portal/complaints"    element={<ParentComplaints />} />
              <Route path="/parent-portal/canteen"       element={<ParentCanteen />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
