const express = require('express');
const router = express.Router();
const { getParents, addParent, updateParent, deleteParent, getParentCredentials } = require('../controllers/parentController');
const { protect, staffOnly, adminOnly } = require('../middlewares/authMiddleware');

router.get('/',                   protect, staffOnly, getParents);
router.post('/',                  protect, staffOnly, addParent);
router.put('/:id',                protect, staffOnly, updateParent);
router.delete('/:id',             protect, adminOnly, deleteParent);
router.get('/:id/credentials',    protect, adminOnly, getParentCredentials);

module.exports = router;
