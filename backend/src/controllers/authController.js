const User = require('../models/User');
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
        student_id: user.student_id || null,
        client_id:  user.client_id  || null,
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

module.exports = { authUser };