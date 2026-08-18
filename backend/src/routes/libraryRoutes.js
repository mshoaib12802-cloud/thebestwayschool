const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly, studentOnly } = require('../middlewares/authMiddleware');
const { getBooks, addBook, updateBook, deleteBook, issueBook, returnBook, getIssues, getMyBooks } = require('../controllers/libraryController');

router.get('/books',              protect, getBooks);
router.post('/books',             protect, staffOnly, addBook);
router.put('/books/:id',          protect, staffOnly, updateBook);
router.delete('/books/:id',       protect, adminOnly, deleteBook);

router.get('/issues',             protect, staffOnly, getIssues);
router.post('/issues',            protect, staffOnly, issueBook);
router.put('/issues/:id/return',  protect, staffOnly, returnBook);

router.get('/my-books',           protect, studentOnly, getMyBooks);

module.exports = router;
