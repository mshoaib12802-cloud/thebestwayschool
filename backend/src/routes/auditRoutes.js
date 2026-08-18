const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const { getLogs, getModules, deleteOld } = require('../controllers/auditController');

router.get('/',         protect, adminOnly, getLogs);
router.get('/modules',  protect, adminOnly, getModules);
router.delete('/old',   protect, adminOnly, deleteOld);

module.exports = router;
