const express = require('express');
const router = express.Router();
const { authUser, studentLogin } = require('../controllers/authController');

router.post('/login', authUser);
router.post('/student-login', studentLogin);

module.exports = router;