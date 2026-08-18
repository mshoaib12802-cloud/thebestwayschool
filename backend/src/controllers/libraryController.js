const Book = require('../models/Book');
const BookIssue = require('../models/BookIssue');
const Student = require('../models/Student');
const Fine = require('../models/Fine');

const FINE_PER_DAY = 5; // Rs. 5 per overdue day

const getBooks = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { is_active: true };
    if (category) filter.category = category;
    if (search) filter.$or = [{ title: new RegExp(search, 'i') }, { author: new RegExp(search, 'i') }, { isbn: new RegExp(search, 'i') }];
    const books = await Book.find(filter).sort({ title: 1 });
    res.json(books);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const addBook = async (req, res) => {
  try {
    const book = await Book.create({ ...req.body, available_copies: req.body.total_copies, added_by: req.user._id });
    res.status(201).json(book);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const updateBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(book);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteBook = async (req, res) => {
  try {
    await Book.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const issueBook = async (req, res) => {
  try {
    const { book_id, borrower_type, student_id, staff_id, due_date } = req.body;
    const book = await Book.findById(book_id);
    if (!book || book.available_copies < 1)
      return res.status(400).json({ message: 'Book not available' });
    const issue = await BookIssue.create({ book_id, borrower_type, student_id, staff_id, due_date, issued_by: req.user._id });
    book.available_copies -= 1;
    await book.save();
    await issue.populate('book_id', 'title author');
    if (student_id) await issue.populate('student_id', 'full_name roll_number');
    if (staff_id) await issue.populate('staff_id', 'name');
    res.status(201).json(issue);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const returnBook = async (req, res) => {
  try {
    const issue = await BookIssue.findById(req.params.id).populate('book_id');
    if (!issue) return res.status(404).json({ message: 'Issue record not found' });
    if (issue.status === 'returned') return res.status(400).json({ message: 'Already returned' });
    const today = new Date();
    const overdueDays = Math.max(0, Math.floor((today - new Date(issue.due_date)) / 86400000));
    const fineAmount = overdueDays * FINE_PER_DAY;
    issue.return_date = today;
    issue.status = 'returned';
    issue.fine_amount = fineAmount;
    issue.returned_to = req.user._id;
    await issue.save();
    issue.book_id.available_copies += 1;
    await issue.book_id.save();
    if (fineAmount > 0 && issue.student_id) {
      await Fine.create({
        target_type: 'student', student_id: issue.student_id,
        category: 'library',
        reason: `Overdue library book: ${issue.book_id.title} (${overdueDays} days late)`,
        amount: fineAmount, issued_by: req.user._id,
      });
    }
    res.json({ issue, overdue_days: overdueDays, fine_amount: fineAmount });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getIssues = async (req, res) => {
  try {
    const { status, student_id, book_id } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (student_id) filter.student_id = student_id;
    if (book_id) filter.book_id = book_id;
    const issues = await BookIssue.find(filter)
      .populate('book_id', 'title author isbn')
      .populate('student_id', 'full_name roll_number')
      .populate('staff_id', 'name')
      .sort({ issue_date: -1 });
    res.json(issues);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getMyBooks = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.json([]);
    const issues = await BookIssue.find({ student_id: student._id, status: { $in: ['issued', 'overdue'] } })
      .populate('book_id', 'title author isbn').sort({ due_date: 1 });
    res.json(issues);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getBooks, addBook, updateBook, deleteBook, issueBook, returnBook, getIssues, getMyBooks };
