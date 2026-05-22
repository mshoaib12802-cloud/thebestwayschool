import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ roles }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'student') return <Navigate to="/student-portal/dashboard" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher-portal/dashboard" replace />;
    if (user.role === 'client')  return <Navigate to="/client-portal/dashboard"  replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
