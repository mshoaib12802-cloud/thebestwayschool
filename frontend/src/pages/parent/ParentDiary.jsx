import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BookOpen, ChevronDown, ChevronUp, AlertCircle, Users } from 'lucide-react';

export default function ParentDiary() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => {
        setChildren(r.data);
        if (r.data.length > 0) setSelectedChild(r.data[0]._id);
      })
      .catch(() => setError('Could not load children'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    setDiaryLoading(true);
    setEntries([]);
    api.get(`/parent-portal/children/${selectedChild}/diary`)
      .then(r => setEntries(r.data))
      .catch(() => setError('Could not load diary for this child'))
      .finally(() => setDiaryLoading(false));
  }, [selectedChild]);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();
  const isYesterday = (d) => {
    if (!d) return false;
    const y = new Date(); y.setDate(y.getDate() - 1);
    return new Date(d).toDateString() === y.toDateString();
  };

  const activeChild = children.find(c => c._id === selectedChild);

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="#99f6e4" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Class Diary</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#99f6e4' }}>Daily lessons, homework & teacher notes</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#0d9488' }}>Loading...</div>
      ) : children.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Users size={36} color="#14b8a6" style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>No children found in your account</p>
        </div>
      ) : (
        <>
          {/* Child Selector */}
          {children.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {children.map(child => {
                const initials = child.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const active = selectedChild === child._id;
                return (
                  <button key={child._id} onClick={() => setSelectedChild(child._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: active ? '2px solid #0d9488' : '2px solid #e2e8f0', background: active ? '#f0fdfa' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: active ? '#0d9488' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: active ? '#fff' : '#475569' }}>
                      {initials}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#0f766e' : '#1e293b' }}>{child.full_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {child.school_class_id?.name || 'Class'}{child.school_class_id?.section ? ` (${child.school_class_id.section})` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Single child label */}
          {children.length === 1 && activeChild && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#f0fdfa', borderRadius: 10, border: '1px solid #99f6e4' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>
                {activeChild.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f766e' }}>{activeChild.full_name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {activeChild.school_class_id?.name || 'Class'}{activeChild.school_class_id?.section ? ` (${activeChild.school_class_id.section})` : ''}
                </div>
              </div>
            </div>
          )}

          {/* Diary Entries */}
          {diaryLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#0d9488' }}>Loading diary...</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <BookOpen size={30} color="#14b8a6" />
              </div>
              <p style={{ margin: 0, fontSize: 15, color: '#64748b', fontWeight: 600 }}>No diary entries yet</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>The teacher hasn't published any entries for this class</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {entries.map(entry => {
                const open = expanded[entry._id];
                const hasHomework = entry.items?.some(i => i.homework);
                const todayFlag = isToday(entry.date);
                const yestFlag = isYesterday(entry.date);
                return (
                  <div key={entry._id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${todayFlag ? '#99f6e4' : '#e2e8f0'}`, overflow: 'hidden', boxShadow: todayFlag ? '0 4px 16px rgba(13,148,136,0.1)' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', cursor: 'pointer', background: open ? '#f0fdfa' : '#fff' }}
                      onClick={() => toggleExpand(entry._id)}>
                      {/* Date badge */}
                      <div style={{ textAlign: 'center', minWidth: 52, background: todayFlag ? '#0d9488' : '#f0fdfa', borderRadius: 10, padding: '6px 8px' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: todayFlag ? '#fff' : '#0f766e', lineHeight: 1 }}>
                          {new Date(entry.date).getDate()}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: todayFlag ? '#99f6e4' : '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {new Date(entry.date).toLocaleDateString('en-GB', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                            {new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                          </span>
                          {todayFlag && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#ccfbf1', color: '#0f766e' }}>Today</span>}
                          {yestFlag && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#f0fdfa', color: '#0d9488' }}>Yesterday</span>}
                          {hasHomework && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e' }}>📚 Homework</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                          {entry.items?.length || 0} subject{entry.items?.length !== 1 ? 's' : ''} covered
                        </div>
                      </div>
                      {open ? <ChevronUp size={18} color="#0d9488" /> : <ChevronDown size={18} color="#94a3b8" />}
                    </div>

                    {open && (
                      <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px 18px', background: '#f9fffe' }}>
                        {entry.items?.map((item, i) => (
                          <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < entry.items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0d9488' }} />
                              <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{item.subject_name || 'Subject'}</span>
                            </div>
                            {item.topic_covered && (
                              <div style={{ display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 14 }}>
                                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, minWidth: 60 }}>Topic:</span>
                                <span style={{ fontSize: 13, color: '#334155' }}>{item.topic_covered}</span>
                              </div>
                            )}
                            {item.homework && (
                              <div style={{ display: 'flex', gap: 8, marginBottom: 6, background: '#fffbeb', padding: '8px 12px', borderRadius: 8, border: '1px solid #fde68a', marginLeft: 0 }}>
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
                          <div style={{ marginTop: 4, padding: '10px 12px', background: '#f0fdfa', borderRadius: 8, border: '1px solid #99f6e4' }}>
                            <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 700 }}>General Note: </span>
                            <span style={{ fontSize: 13, color: '#0d9488' }}>{entry.general_note}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
