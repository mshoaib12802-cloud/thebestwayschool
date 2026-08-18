import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { BookMarked, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const daysRemaining = (due) => {
  if (!due) return null;
  const diff = Math.ceil((new Date(due) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

export default function StudentLibrary() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student-portal/library/my-books')
      .then(r => setBooks(r.data))
      .catch(() => toast.error('Failed to load library books'))
      .finally(() => setLoading(false));
  }, []);

  const getDueStyle = (days) => {
    if (days === null) return { color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', label: '—' };
    if (days < 0)  return { color: 'text-red-600',   bg: 'bg-red-50 border-red-200',     label: `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue` };
    if (days <= 7) return { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: `${days} day${days !== 1 ? 's' : ''} left` };
    return { color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: `${days} days left` };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <BookMarked size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Library Books</h1>
          <p className="text-slate-500 text-sm">Books currently issued to you</p>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <BookMarked size={56} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-1">No books issued</h3>
          <p className="text-sm">You have no library books currently issued. Visit the library to borrow books.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map(book => {
            const days = daysRemaining(book.due_date || book.return_date);
            const style = getDueStyle(days);
            const isOverdue = days !== null && days < 0;
            return (
              <div key={book._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isOverdue ? 'border-red-200' : 'border-slate-100'}`}>
                {/* Top accent */}
                <div className={`h-1.5 ${isOverdue ? 'bg-red-400' : days !== null && days <= 7 ? 'bg-amber-400' : 'bg-green-400'}`} />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                      <BookMarked size={18} className={style.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{book.book_id?.title || book.title || 'Unknown Book'}</h3>
                      <p className="text-sm text-slate-500 truncate">{book.book_id?.author || book.author || '—'}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Issued on</span>
                      <span className="font-medium text-slate-700">{fmt(book.issued_date || book.issue_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Due date</span>
                      <span className="font-medium text-slate-700">{fmt(book.due_date || book.return_date)}</span>
                    </div>
                    {book.book_id?.isbn && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">ISBN</span>
                        <span className="font-mono text-xs text-slate-600">{book.book_id.isbn}</span>
                      </div>
                    )}
                  </div>

                  <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-xl border ${style.bg} ${style.color}`}>
                    {isOverdue
                      ? <AlertTriangle size={14} className="shrink-0" />
                      : days !== null && days <= 7
                        ? <Clock size={14} className="shrink-0" />
                        : <CheckCircle2 size={14} className="shrink-0" />
                    }
                    <span className="text-xs font-semibold">{style.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
