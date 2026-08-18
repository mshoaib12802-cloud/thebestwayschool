import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { BookOpen, Star, Calendar } from 'lucide-react';

const TYPE_COLOR = { homework:'#818cf8', classwork:'#34d399', project:'#fbbf24', reading:'#38bdf8', revision:'#a78bfa', other:'#94a3b8' };

export default function StudentHomework() {
  const { user } = useContext(AuthContext);
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    api.get('/homework/student')
      .then(r => setHomework(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = homework.filter(h => !filterType || h.type === filterType);
  const TYPES = [...new Set(homework.map(h => h.type))];

  const today = new Date().toDateString();
  const overdue = filtered.filter(h => h.due_date && new Date(h.due_date) < new Date() && h.due_date.slice(0,10) !== new Date().toISOString().slice(0,10));
  const upcoming = filtered.filter(h => !h.due_date || new Date(h.due_date) >= new Date());

  const Section = ({ title, items, color }) => (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: color || '#c7d2fe', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color || '#818cf8', display: 'inline-block' }} />
        {title} <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p style={{ color: '#a5b4fc', fontSize: 13, margin: 0, opacity: 0.6 }}>None</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(h => (
            <div key={h._id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(165,180,252,0.15)', borderLeft: `4px solid ${TYPE_COLOR[h.type] || '#94a3b8'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${TYPE_COLOR[h.type]}25`, color: TYPE_COLOR[h.type] || '#94a3b8' }}>
                      {h.type}
                    </span>
                    {h.is_important && <Star size={13} fill="#fbbf24" color="#fbbf24" />}
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#eef2ff' }}>{h.title}</p>
                  {h.description && <p style={{ margin: '5px 0 0', fontSize: 13, color: '#a5b4fc', lineHeight: 1.5 }}>{h.description}</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#818cf8' }}>Subject: {h.subject_id?.name || '—'}</span>
                <span style={{ fontSize: 12, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> {h.date ? new Date(h.date).toLocaleDateString() : '—'}
                </span>
                {h.due_date && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: overdue.includes(h) ? '#fca5a5' : '#fde68a', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Due: {new Date(h.due_date).toLocaleDateString()}
                    {overdue.includes(h) && ' ⚠️'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#eef2ff', margin: 0 }}>Homework Diary</h1>
        <p style={{ color: '#a5b4fc', fontSize: 13, margin: '3px 0 0' }}>Your assigned homework and classwork</p>
      </div>

      {loading ? (
        <p style={{ color: '#a5b4fc', fontSize: 14 }}>Loading...</p>
      ) : homework.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#a5b4fc', opacity: 0.6 }}>
          <BookOpen size={40} style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No homework assigned</p>
        </div>
      ) : (
        <>
          {TYPES.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterType('')} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: !filterType ? '#818cf8' : 'rgba(255,255,255,0.1)', color: !filterType ? '#fff' : '#a5b4fc' }}>All</button>
              {TYPES.map(t => (
                <button key={t} onClick={() => setFilterType(t)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: filterType === t ? TYPE_COLOR[t] || '#818cf8' : 'rgba(255,255,255,0.1)', color: filterType === t ? '#fff' : '#a5b4fc' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
          {overdue.length > 0 && <Section title="Overdue" items={overdue} color="#fca5a5" />}
          <Section title="Upcoming & Active" items={upcoming} color="#818cf8" />
        </>
      )}
    </div>
  );
}
