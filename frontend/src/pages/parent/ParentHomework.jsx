import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { BookOpen, Star, Calendar } from 'lucide-react';

const TYPE_COLOR = { homework:'#34d399', classwork:'#10b981', project:'#fbbf24', reading:'#38bdf8', revision:'#a78bfa', other:'#94a3b8' };

export default function ParentHomework() {
  const { user } = useContext(AuthContext);
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    api.get('/parent-portal/homework')
      .then(r => setHomework(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = homework.filter(h => !filterType || h.type === filterType);
  const TYPES = [...new Set(homework.map(h => h.type))];
  const overdue = filtered.filter(h => h.due_date && new Date(h.due_date) < new Date());
  const active = filtered.filter(h => !h.due_date || new Date(h.due_date) >= new Date());

  const Card = ({ h }) => (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(153,246,228,0.15)', borderLeft: `4px solid ${TYPE_COLOR[h.type] || '#94a3b8'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${TYPE_COLOR[h.type]}25`, color: TYPE_COLOR[h.type] || '#94a3b8' }}>
          {h.type}
        </span>
        {h.is_important && <Star size={13} fill="#fbbf24" color="#fbbf24" />}
      </div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#f0fdfa' }}>{h.title}</p>
      {h.description && <p style={{ margin: '5px 0 0', fontSize: 13, color: '#99f6e4', lineHeight: 1.5 }}>{h.description}</p>}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#5eead4' }}>Subject: {h.subject_id?.name || '—'} · Class: {h.class_id?.name || '—'}</span>
        <span style={{ fontSize: 12, color: '#5eead4', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} /> {h.date ? new Date(h.date).toLocaleDateString() : '—'}
        </span>
        {h.due_date && (
          <span style={{ fontSize: 12, fontWeight: 700, color: overdue.includes(h) ? '#fca5a5' : '#fde68a' }}>
            Due: {new Date(h.due_date).toLocaleDateString()} {overdue.includes(h) ? '⚠️' : ''}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0fdfa', margin: 0 }}>Homework Diary</h1>
        <p style={{ color: '#99f6e4', fontSize: 13, margin: '3px 0 0' }}>Your child's homework and classwork assignments</p>
      </div>

      {loading ? (
        <p style={{ color: '#99f6e4', fontSize: 14 }}>Loading...</p>
      ) : homework.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#99f6e4', opacity: 0.6, background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
          <BookOpen size={36} style={{ marginBottom: 10 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No homework assigned</p>
        </div>
      ) : (
        <>
          {TYPES.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterType('')} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: !filterType ? '#0d9488' : 'rgba(255,255,255,0.1)', color: '#fff' }}>All</button>
              {TYPES.map(t => (
                <button key={t} onClick={() => setFilterType(t)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: filterType === t ? TYPE_COLOR[t] || '#0d9488' : 'rgba(255,255,255,0.1)', color: '#fff' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
          {overdue.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                Overdue ({overdue.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {overdue.map(h => <Card key={h._id} h={h} />)}
              </div>
            </div>
          )}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#5eead4', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2dd4bf', display: 'inline-block' }} />
              Active & Upcoming ({active.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.map(h => <Card key={h._id} h={h} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
