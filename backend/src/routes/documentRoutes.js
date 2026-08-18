const express = require('express');
const router  = express.Router();
const { protect, staffOnly } = require('../middlewares/authMiddleware');
const { getDocuments, uploadDocument, deleteDocument } = require('../controllers/documentController');
const { uploadDoc } = require('../middlewares/uploadDocs');

router.get('/',       protect, staffOnly, getDocuments);
router.post('/',      protect, staffOnly, uploadDoc.single('file'), uploadDocument);
router.delete('/:id', protect, staffOnly, deleteDocument);

module.exports = router;
