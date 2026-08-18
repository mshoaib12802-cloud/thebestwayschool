const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly } = require('../middlewares/authMiddleware');
const { getEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');

router.get('/',         protect, getEvents);
router.post('/',        protect, staffOnly, createEvent);
router.put('/:id',      protect, staffOnly, updateEvent);
router.delete('/:id',   protect, adminOnly, deleteEvent);

module.exports = router;
