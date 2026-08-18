const express = require('express');
const router  = express.Router();
const { protect, adminOnly, staffOnly } = require('../middlewares/authMiddleware');
const {
  getSeatingPlans, createSeatingPlan, getSeatingPlan,
  deleteSeatingPlan, reshuffleSeatingPlan,
} = require('../controllers/seatingPlanController');

router.get('/',              protect, staffOnly, getSeatingPlans);
router.post('/',             protect, staffOnly, createSeatingPlan);
router.get('/:id',           protect, staffOnly, getSeatingPlan);
router.post('/:id/reshuffle',protect, staffOnly, reshuffleSeatingPlan);
router.delete('/:id',        protect, adminOnly, deleteSeatingPlan);

module.exports = router;
