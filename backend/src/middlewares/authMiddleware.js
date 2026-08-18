const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists. Please contact admin.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};

// Admin only
const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Access denied — admin only' });
};

// Admin panel staff: admin, clerk, office_boy
const staffOnly = (req, res, next) => {
  const allowed = ['admin', 'clerk', 'office_boy'];
  if (allowed.includes(req.user?.role)) return next();
  return res.status(403).json({ message: 'Access denied — admin staff only' });
};

// Teachers only
const teacherOnly = (req, res, next) => {
  if (req.user?.role === 'teacher') return next();
  return res.status(403).json({ message: 'Access denied — teachers only' });
};

// Students only
const studentOnly = (req, res, next) => {
  if (req.user?.role === 'student') return next();
  return res.status(403).json({ message: 'Access denied — students only' });
};

// Staff + Teachers (for shared resources like course modules)
const staffOrTeacher = (req, res, next) => {
  const allowed = ['admin', 'clerk', 'office_boy', 'teacher'];
  if (allowed.includes(req.user?.role)) return next();
  return res.status(403).json({ message: 'Access denied' });
};

// Parents only
const parentOnly = (req, res, next) => {
  if (req.user?.role === 'parent') return next();
  return res.status(403).json({ message: 'Access denied — parents only' });
};

module.exports = { protect, adminOnly, staffOnly, teacherOnly, studentOnly, staffOrTeacher, parentOnly };
