const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const { chat } = require('../controllers/aiController');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.post('/chat', protect, staffOnly, chat);

// Quick test — no tools, no system prompt, just a raw "ping" to Gemini
router.get('/test', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) return res.json({ ok: false, error: 'No API key' });
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent('Say "ok" in one word.');
    res.json({ ok: true, reply: result.response.text() });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

module.exports = router;
