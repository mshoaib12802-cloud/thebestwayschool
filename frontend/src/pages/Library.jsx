import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  BookOpen, Plus, Edit2, Trash2, X, Search, RefreshCw,
  RotateCcw, AlertTriangle
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const initBookForm = { title: '', author: '', isbn: '', category: '', total_copies: 1, shelf_location: '' };
const initIssueForm = { book_id: '', borrower_type: 'student', borrower_id: '', due_date: '', notes: '' };

export default function Library() {
  const [activeTab, setActiveTab] = useState('books');

  // Books
  const [books, setBooks] = useState([]);
  const [bookSearch, setBookSearch] = useState('');
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editBookId, setEditBookId] = useState(null);
  const [bookForm, setBookForm] = useState(initBookForm);
  const [savingBook, setSavingBook] = useState(false);

  // Issues
  const [issues, setIssues] = useState([]);
  const [issueStatus, setIssueStatus] = useState('all');
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState(initIssueForm);
  const [savingIssue, setSavingIssue] = useState(false);
  const [returningId, setReturningId] = useState(null);

  // Borrowers
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);

  useEffect(() => { fetchBooks(); fetchStudents(); fetchStaff(); }, []);
  useEffect(() => { fetchIssues(); }, [issueStatus]);
  useEffect(() => {
    document.body.style.overflow = (showBookModal || showIssueModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showBookModal, showIssueModal]);

  const fetchBooks = async () => {
    setLoadingBooks(true);
    try { const { data } = await api.get('/library/books'); setBooks(data); }
    catch { toast.error('Failed to load books'); }
    finally { setLoadingBooks(false); }
  };
  const fetchIssues = async () => {
    setLoadingIssues(true);
    try {
      const params = issueStatus !== 'all' ? { status: issueStatus } : {};
      const { data } = await api.get('/library/issues', { params });
      setIssues(data);
    } catch { toast.error('Failed to load issues'); }
    finally { setLoadingIssues(false); }
  };
  const fetchStudents = async () => {
    try { const { data } = await api.get('/students'); setStudents(data); } catch { /* optional */ }
  };
  const fetchStaff = async () => {
    try { const { data } = await api.get('/staff'); setStaff(data); } catch { /* optional */ }
  };

  const openAddBook = () => { setEditBookId(null); setBookForm(initBookForm); setShowBookModal(true); };
  const openEditBook = (b) => {
    setEditBookId(b._id);
    setBookForm({ title: b.title, author: b.author, isbn: b.isbn || '', category: b.category || '', total_copies: b.total_copies || 1, shelf_location: b.shelf_location || '' });
    setShowBookModal(true);
  };

  const saveBook = async (e) => {
    e.preventDefault();
    setSavingBook(true);
    try {
      if (editBookId) { await api.put(`/library/books/${editBookId}`, bookForm); toast.success('Book updated'); }
      else { await api.post('/library/books', bookForm); toast.success('Book added'); }
      setShowBookModal(false);
      fetchBooks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSavingBook(false); }
  };

  const deleteBook = async (id) => {
    if (!window.confirm('Delete this book?')) return;
    try { await api.delete(`/library/books/${id}`); toast.success('Deleted'); fetchBooks(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const issueBook = async (e) => {
    e.preventDefault();
    setSavingIssue(true);
    try {
      await api.post('/library/issues', issueForm);
      toast.success('Book issued successfully');
      setShowIssueModal(false);
      fetchIssues();
      fetchBooks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to issue book'); }
    finally { setSavingIssue(false); }
  };

  const returnBook = async (issueId) => {
    setReturningId(issueId);
    try {
      await api.put(`/library/issues/${issueId}/return`);
      toast.success('Book returned');
      fetchIssues();
      fetchBooks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to return'); }
    finally { setReturningId(null); }
  };

  const filteredBooks = books.filter(b => {
    if (!bookSearch) return true;
    const q = bookSearch.toLowerCase();
    return b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q) || b.isbn?.toLowerCase().includes(q) || b.category?.toLowerCase().includes(q);
  });

  const STATUS_META = {
    issued:   { label: 'Issued',   cls: 'bg-sky-100 text-sky-700' },
    returned: { label: 'Returned', cls: 'bg-emerald-100 text-emerald-700' },
    overdue:  { label: 'Overdue',  cls: 'bg-red-100 text-red-700' },
  };

  const borrowers = issueForm.borrower_type === 'student' ? students : staff;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center shadow">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Library</h1>
          <p className="text-sm text-slate-500">Manage books and issue records</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 border border-slate-100 shadow-sm mb-6 w-fit">
        {[{ id: 'books', label: 'Books' }, { id: 'issues', label: 'Issues' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Books Tab */}
      {activeTab === 'books' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 flex-1 max-w-xs border border-slate-200">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Search books…"
                className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
            </div>
            <button onClick={openAddBook} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-700 text-sm">
              <Plus className="w-4 h-4" /> Add Book
            </button>
          </div>
          {loadingBooks ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" /></div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No books found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Author</th>
                  <th className="text-left px-4 py-3">ISBN</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-center px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">Available</th>
                  <th className="text-left px-4 py-3">Shelf</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBooks.map(b => (
                    <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{b.title}</td>
                      <td className="px-4 py-3 text-slate-600">{b.author}</td>
                      <td className="px-4 py-3 text-slate-500">{b.isbn || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{b.category || '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-700 font-semibold">{b.total_copies || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-sm ${(b.available_copies || 0) === 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {b.available_copies ?? b.total_copies ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{b.shelf_location || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditBook(b)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 mr-1"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteBook(b._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex gap-2">
              {['all', 'issued', 'returned', 'overdue'].map(s => (
                <button key={s} onClick={() => setIssueStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${issueStatus === s ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => { setIssueForm(initIssueForm); setShowIssueModal(true); }}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-700 text-sm">
              <Plus className="w-4 h-4" /> Issue Book
            </button>
          </div>
          {loadingIssues ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" /></div>
          ) : issues.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No issue records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Book</th>
                  <th className="text-left px-4 py-3">Borrower</th>
                  <th className="text-left px-4 py-3">Issue Date</th>
                  <th className="text-left px-4 py-3">Due Date</th>
                  <th className="text-left px-4 py-3">Return Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Fine</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {issues.map(iss => {
                    const isOverdue = iss.status === 'overdue' || (!iss.return_date && iss.due_date && new Date(iss.due_date) < new Date());
                    const meta = STATUS_META[isOverdue && !iss.return_date ? 'overdue' : iss.status] || STATUS_META.issued;
                    return (
                      <tr key={iss._id} className={`hover:bg-slate-50 transition-colors ${isOverdue && !iss.return_date ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3 font-semibold text-slate-800">{iss.book_title}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-700">{iss.borrower_name}</div>
                          <div className="text-xs text-slate-400 capitalize">{iss.borrower_type}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{iss.issue_date ? new Date(iss.issue_date).toLocaleDateString() : '—'}</td>
                        <td className={`px-4 py-3 ${isOverdue && !iss.return_date ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                          {iss.due_date ? new Date(iss.due_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{iss.return_date ? new Date(iss.return_date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-500">
                          {iss.fine_amount ? `₹${iss.fine_amount}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!iss.return_date && (
                            <button onClick={() => returnBook(iss._id)} disabled={returningId === iss._id}
                              className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 ml-auto">
                              <RotateCcw className="w-3 h-3" /> Return
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Book Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editBookId ? 'Edit Book' : 'Add Book'}</h2>
              <button onClick={() => setShowBookModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={saveBook} className="p-5 space-y-3">
              <div><label className={labelCls}>Title *</label><input required value={bookForm.title} onChange={e => setBookForm(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Author *</label><input required value={bookForm.author} onChange={e => setBookForm(p => ({ ...p, author: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>ISBN</label><input value={bookForm.isbn} onChange={e => setBookForm(p => ({ ...p, isbn: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Category</label><input value={bookForm.category} onChange={e => setBookForm(p => ({ ...p, category: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Total Copies</label><input type="number" min="1" value={bookForm.total_copies} onChange={e => setBookForm(p => ({ ...p, total_copies: parseInt(e.target.value) || 1 }))} className={inputCls} /></div>
                <div><label className={labelCls}>Shelf Location</label><input value={bookForm.shelf_location} onChange={e => setBookForm(p => ({ ...p, shelf_location: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBookModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={savingBook} className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-700 text-sm disabled:opacity-60">
                  {savingBook ? 'Saving…' : editBookId ? 'Update' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Issue Book</h2>
              <button onClick={() => setShowIssueModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={issueBook} className="p-5 space-y-3">
              <div>
                <label className={labelCls}>Book *</label>
                <select required value={issueForm.book_id} onChange={e => setIssueForm(p => ({ ...p, book_id: e.target.value }))} className={inputCls}>
                  <option value="">Select Book</option>
                  {books.filter(b => (b.available_copies ?? b.total_copies ?? 0) > 0).map(b => (
                    <option key={b._id} value={b._id}>{b.title} ({b.available_copies ?? '?'} left)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Borrower Type</label>
                <select value={issueForm.borrower_type} onChange={e => setIssueForm(p => ({ ...p, borrower_type: e.target.value, borrower_id: '' }))} className={inputCls}>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{issueForm.borrower_type === 'student' ? 'Student' : 'Staff'} *</label>
                <select required value={issueForm.borrower_id} onChange={e => setIssueForm(p => ({ ...p, borrower_id: e.target.value }))} className={inputCls}>
                  <option value="">Select {issueForm.borrower_type}</option>
                  {borrowers.map(b => <option key={b._id} value={b._id}>{b.full_name || b.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Due Date *</label>
                <input required type="date" value={issueForm.due_date} onChange={e => setIssueForm(p => ({ ...p, due_date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <input value={issueForm.notes} onChange={e => setIssueForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} placeholder="Optional notes" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowIssueModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={savingIssue} className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-700 text-sm disabled:opacity-60">
                  {savingIssue ? 'Issuing…' : 'Issue Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
