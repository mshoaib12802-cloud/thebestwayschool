const User = require('../models/User');
const Student = require('../models/Student');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/users/login
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // 2. Find user in DB
    const user = await User.findOne({ email });

    // 3. Check User & Match Password
    // user.matchPassword Model ke andar bana hua function hai
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        student_id:  user.student_id  || null,
        client_id:   user.client_id   || null,
        student_ids: user.student_ids || [],
        token: generateToken(user._id),
      });
    } else {
      // Agar user nahi mila ya password galat hai
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Student portal login — phone number + name-derived password
// @route   POST /api/auth/student-login
const studentLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: 'Please provide phone number and password' });
    }

    const student = await Student.findOne({ phone: phone.trim() });
    if (!student) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    // Derive expected password: full_name with first letter capitalised, no spaces
    const raw = student.full_name.trim().replace(/\s+/g, '');
    const expectedPassword = raw.charAt(0).toUpperCase() + raw.slice(1);

    if (password !== expectedPassword) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    if (!student.user_id) {
      return res.status(401).json({ message: 'No portal account linked to this student' });
    }

    const user = await User.findById(student.user_id);
    if (!user) {
      return res.status(401).json({ message: 'Portal account not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      student_id:  user.student_id  || null,
      client_id:   user.client_id   || null,
      student_ids: user.student_ids || [],
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { authUser, studentLogin };