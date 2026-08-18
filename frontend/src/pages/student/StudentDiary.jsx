import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BookOpen, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function StudentDiary() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student-portal/diary')
      .then(r => setEntries(r.data))
      .catch(() => setError('Could not load diary entries'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();
  const isYesterday = (d) => {
    if (!d) return false;
    const y = new Date(); y.setDate(y.getDate() - 1);
    return new Date(d).toDateString() === y.toDateString();
  };

  const getDayLabel = (d) => {
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return null;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="#a5b4fc" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Class Diary</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#a5b4fc' }}>Daily topics, homework & class notes</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 50, textAlign: 'center', color: '#818cf8' }}>Loading diary...</div>
      ) : entries.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BookOpen size={30} color="#818cf8" />
          </div>
          <p style={{ margin: 0, fontSize: 15, color: '#64748b', fontWeight: 600 }}>No diary entries yet</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>Your teacher hasn't published any entries yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(entry => {
            const open = expanded[entry._id];
            const dayLabel = getDayLabel(entry.date);
            const hasHomework = entry.items?.some(i => i.homework);
            return (
              <div key={entry._id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(99,102,241,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', cursor: 'pointer', background: open ? 'linear-gradient(135deg,#eef2ff,#f5f3ff)' : '#fff', transition: 'background 0.2s' }}
                  onClick={() => toggleExpand(entry._id)}>
                  {/* Date badge */}
                  <div style={{ textAlign: 'center', minWidth: 48 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#312e81', lineHeight: 1 }}>
                      {new Date(entry.date).getDate()}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {new Date(entry.date).toLocaleDateString('en-GB', { month: 'short' })}
                    </div>
                  </div>
                  <div style={{ width: 1, height: 36, background: '#e2e8f0', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                        {new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                      </span>
                      {dayLabel && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#e0e7ff', color: '#4338ca' }}>{dayLabel}</span>
                      )}
                      {hasHomework && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e' }}>Homework</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                      {entry.items?.length || 0} subject{entry.items?.length !== 1 ? 's' : ''} covered
                      {entry.general_note && ' · General note'}
                    </div>
                  </div>
                  {open ? <ChevronUp size={18} color="#818cf8" /> : <ChevronDown size={18} color="#94a3b8" />}
                </div>

                {open && (
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px 18px', background: '#fafbff' }}>
                    {entry.items?.map((item, i) => (
                      <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < entry.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{item.subject_name || 'Subject'}</span>
                        </div>
                        {item.topic_covered && (
                          <div style={{ display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 14 }}>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, minWidth: 60 }}>Topic:</span>
                            <span style={{ fontSize: 13, color: '#334155' }}>{item.topic_covered}</span>
                          </div>
                        )}
                        {item.homework && (
                          <div style={{ display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 14, background: '#fffbeb', padding: '8px 12px', borderRadius: 8, border: '1px solid #fde68a', marginLeft: 0 }}>
                            <span style={{ fontSize: 12, color: '#d97706', fontWeight: 700, minWidth: 60 }}>Homework:</span>
                            <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>{item.homework}</span>
                          </div>
                        )}
                        {item.notes && (
                          <div style={{ display: 'flex', gap: 8, paddingLeft: 14, marginTop: 4 }}>
                            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, minWidth: 60 }}>Notes:</span>
                            <span style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>{item.notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {entry.general_note && (
                      <div style={{ marginTop: 4, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>General Note: </span>
                        <span style={{ fontSize: 13, color: '#15803d' }}>{entry.general_note}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
