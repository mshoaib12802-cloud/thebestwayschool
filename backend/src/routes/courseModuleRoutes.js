const express = require('express');
const router = express.Router();
const { protect, staffOrTeacher } = require('../middlewares/authMiddleware');
const {
  getModulesByCourse, getAllModuleStats,
  addModule, updateModule, deleteModule,
  startModule, completeModule, resetModule, moveModule
} = require('../controllers/courseModuleController');

router.use(protect, staffOrTeacher);

router.get('/stats',         getAllModuleStats);
router.get('/:courseId',     getModulesByCourse);
router.post('/:courseId',    addModule);
router.put('/:id/start',     startModule);
router.put('/:id/complete',  completeModule);
router.put('/:id/reset',     resetModule);
router.put('/:id/move',      moveModule);
router.put('/:id',           updateModule);
router.delete('/:id',        deleteModule);

module.exports = router;
