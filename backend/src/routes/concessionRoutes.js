const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const { getAll, getByStudent, create, update, remove, calculateEffective } = require('../controllers/concessionController');

router.get('/',                    protect, staffOnly, getAll);
router.get('/calculate',           protect, staffOnly, calculateEffective);
router.get('/student/:studentId',  protect, getByStudent);
router.post('/',                   protect, staffOnly, create);
router.put('/:id',                 protect, staffOnly, update);
router.delete('/:id',              protect, staffOnly, remove);

module.exports = router;
