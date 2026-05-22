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

import ClientLogin from './pages/ClientLogin';
import Clients from './pages/Clients';
import ClientPortalLayout from './pages/client/ClientPortalLayout';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientProjects from './pages/client/ClientProjects';
import ClientInvoices from './pages/client/ClientInvoices';
import ClientMessages from './pages/client/ClientMessages';
import ClientProfile from './pages/client/ClientProfile';

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
              <Route path="/teacher-portal/lms" element={<TeacherLMS />} />
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
              <Route path="/student-portal/lms" element={<StudentLMS />} />
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
