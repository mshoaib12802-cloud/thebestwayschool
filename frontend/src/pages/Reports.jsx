import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
  Users, Briefcase, Search, ChevronRight, X, Loader2,
  CalendarCheck, Wallet, BookOpen, ShieldCheck, CalendarOff,
  AlertTriangle, TrendingUp, User, Phone, MapPin, Hash,
  GraduationCap, Clock, CheckCircle, XCircle, MinusCircle,
  BarChart2, ArrowLeft, Printer, FileText, DollarSign,
} from 'lucide-react';

// ─── helpers ───────────────────────────────────────────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const monthLabel = (m) => {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  return new Date(y, +mo - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
};

const grade = (pct) => {
  if (pct >= 90) return { g: 'A+', color: '#059669' };
  if (pct >= 80) return { g: 'A',  color: '#10b981' };
  if (pct >= 70) return { g: 'B',  color: '#0284c7' };
  if (pct >= 60) return { g: 'C',  color: '#7c3aed' };
  if (pct >= 50) return { g: 'D',  color: '#d97706' };
  return { g: 'F', color: '#dc2626' };
};

const TABS_STUDENT = ['Overview', 'Attendance', 'Academic', 'Fees', 'Conduct', 'Leave', 'Fines'];
const TABS_STAFF   = ['Overview', 'Attendance', 'Payroll',  'Leave', 'Fines',  'Advances'];

const Badge = ({ color, children }) => (
  <span style={{ background: color + '18', color, border: `1px solid ${color}30`, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
    {children}
  </span>
);

const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}` }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</p>}
      </div>
      {Icon && <div style={{ background: color + '18', borderRadius: 10, padding: 10 }}><Icon size={20} color={color} /></div>}
    </div>
  </div>
);

const PctBar = ({ value, color }) => (
  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 7, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(value, 100)}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.5s ease' }} />
  </div>
);

// ─── Detail modal ──────────────────────────────────────────────────────────

function ReportDetail({ person, onClose }) {
  const [tab, setTab]     = useState('Overview');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isStudent = person.type === 'student';
  const TABS = isStudent ? TABS_STUDENT : TABS_STAFF;

  useEffect(() => {
    setLoading(true);
    setError('');
    const url = isStudent ? `/reports/student/${person._id}` : `/reports/staff/${person._id}`;
    api.get(url)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.message || 'Failed to load'); setLoading(false); });
  }, [person._id, isStudent]);

  const attColor = (pct) => pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: '#f8fafc', borderRadius: 18, width: '100%', maxWidth: 860, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', marginTop: 8, marginBottom: 24 }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '18px 18px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: isStudent ? '#6366f1' : '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0, border: '3px solid rgba(255,255,255,0.2)' }}>
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0 }}>{person.name}</h2>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '2px 0 0' }}>
              {isStudent ? `${person.sub || ''} · Roll: ${person.roll_number || '—'} · ${person.academic_year || ''}` : person.sub?.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', gap: 2, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent', color: tab === t ? '#6366f1' : '#64748b', transition: 'all 0.15s' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px', minHeight: 400 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
            </div>
          )}
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, color: '#dc2626' }}>{error}</div>}

          {!loading && !error && data && (
            <>
              {/* ── OVERVIEW ── */}
              {tab === 'Overview' && (
                <div>
                  {/* Quick Stats Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                    {isStudent ? <>
                      <StatCard label="Attendance" value={`${data.attendance.summary.percentage}%`} sub={`${data.attendance.summary.present_effective}/${data.attendance.summary.total} days`} color={attColor(data.attendance.summary.percentage)} icon={CalendarCheck} />
                      <StatCard label="Fee Balance" value={`Rs. ${fmt(data.fees.summary.balance)}`} sub={`${data.fees.summary.overdue_count} overdue`} color={data.fees.summary.balance > 0 ? '#ef4444' : '#10b981'} icon={Wallet} />
                      <StatCard label="Conduct" value={`${data.conduct.summary.net >= 0 ? '+' : ''}${data.conduct.summary.net} pts`} sub={`${data.conduct.summary.count} records`} color={data.conduct.summary.net >= 0 ? '#10b981' : '#ef4444'} icon={ShieldCheck} />
                      <StatCard label="Fines Pending" value={`Rs. ${fmt(data.fines.summary.pending)}`} sub={`${data.fines.summary.count} issued`} color="#f59e0b" icon={AlertTriangle} />
                    </> : <>
                      <StatCard label="Attendance" value={`${data.attendance.summary.percentage}%`} sub={`${data.attendance.summary.present_effective}/${data.attendance.summary.total} days`} color={attColor(data.attendance.summary.percentage)} icon={CalendarCheck} />
                      <StatCard label="Total Salary Paid" value={`Rs. ${fmt(data.payroll.summary.total_paid)}`} sub={`${data.payroll.summary.months_count} months`} color="#0891b2" icon={DollarSign} />
                      <StatCard label="Leave Taken" value={`${data.leave.summary.total_days_taken} days`} sub={`${data.leave.summary.approved} approved`} color="#7c3aed" icon={CalendarOff} />
                      <StatCard label="Outstanding Advances" value={`Rs. ${fmt(data.advances.summary.outstanding)}`} sub={`${data.advances.summary.count} advances`} color="#f59e0b" icon={FileText} />
                    </>}
                  </div>

                  {/* Profile Info */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={15} /> Personal Information
                    </h3>
                    {isStudent ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 20px' }}>
                        {[
                          ['Full Name', data.profile.full_name],
                          ['Name (Urdu)', data.profile.full_name_urdu],
                          ['Roll No.', data.profile.roll_number],
                          ['Date of Birth', fmtDate(data.profile.dob)],
                          ['Gender', data.profile.gender],
                          ['Blood Group', data.profile.blood_group],
                          ['Religion', data.profile.religion],
                          ['Class', `${data.profile.school_class_id?.name || ''} ${data.profile.school_class_id?.section || ''}`],
                          ['Section', data.profile.section],
                          ['Medium', data.profile.medium],
                          ['Subject Group', data.profile.subject_group],
                          ['Admission Date', fmtDate(data.profile.admission_date)],
                          ['Father Name', data.profile.father_name],
                          ['Father Phone', data.profile.father_phone],
                          ['Father CNIC', data.profile.father_cnic],
                          ['Mother Name', data.profile.mother_name],
                          ['Guardian', data.profile.guardian_name],
                          ['Phone', data.profile.phone],
                          ['Email', data.profile.email],
                          ['Address', data.profile.address],
                          ['City', data.profile.city],
                          ['B-Form No', data.profile.b_form_no],
                          ['Previous School', data.profile.previous_school],
                          ['Disability', data.profile.disability],
                          ['Allergies', data.profile.allergies],
                          ['Emergency Contact', data.profile.emergency_contact_name],
                          ['Emergency Phone', data.profile.emergency_contact_phone],
                        ].filter(([, v]) => v).map(([label, val]) => (
                          <div key={label}>
                            <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                            <p style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, marginTop: 1 }}>{val}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 20px' }}>
                        {[
                          ['Name', data.profile.name],
                          ['Email', data.profile.email],
                          ['Role', data.profile.role?.replace('_', ' ')],
                          ['Joining Date', fmtDate(data.profile.joining_date)],
                          ['Salary Type', data.profile.salary_type],
                          ['Salary Amount', data.profile.salary_amount ? `Rs. ${fmt(data.profile.salary_amount)}` : null],
                        ].filter(([, v]) => v).map(([label, val]) => (
                          <div key={label}>
                            <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                            <p style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, marginTop: 1 }}>{val}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ATTENDANCE ── */}
              {tab === 'Attendance' && (
                <div>
                  {/* Summary cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
                    {[
                      ['Present', data.attendance.summary.present, '#10b981'],
                      ['Absent',  data.attendance.summary.absent,  '#ef4444'],
                      ['Late',    data.attendance.summary.late,    '#f59e0b'],
                      ['Leave',   data.attendance.summary.leave,   '#6366f1'],
                      ['Half Day',data.attendance.summary.half_day,'#0891b2'],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center', borderTop: `3px solid ${color}` }}>
                        <p style={{ fontSize: 22, fontWeight: 800, color }}>{val}</p>
                        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</p>
                      </div>
                    ))}
                    <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center', borderTop: `3px solid ${attColor(data.attendance.summary.percentage)}` }}>
                      <p style={{ fontSize: 22, fontWeight: 800, color: attColor(data.attendance.summary.percentage) }}>{data.attendance.summary.percentage}%</p>
                      <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Overall</p>
                    </div>
                  </div>

                  {/* Monthly chart */}
                  {data.attendance.monthly.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
                      <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 14 }}>Monthly Breakdown</h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              {['Month', 'Total', 'Present', 'Absent', 'Late', '%'].map(h => (
                                <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Month' ? 'left' : 'center', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...data.attendance.monthly].reverse().map(m => {
                              const pct = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
                              return (
                                <tr key={m.month} style={{ borderTop: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{monthLabel(m.month)}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{m.total}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{m.present}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{m.absent}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>{m.late}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    <span style={{ color: attColor(pct), fontWeight: 700 }}>{pct}%</span>
                                    <PctBar value={pct} color={attColor(pct)} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recent records */}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Recent Attendance (last 30)</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {data.attendance.recent.map(a => {
                        const statusColors = { present: '#10b981', absent: '#ef4444', late: '#f59e0b', leave: '#6366f1', half_day: '#0891b2' };
                        const c = statusColors[a.status] || '#94a3b8';
                        return (
                          <div key={a._id} title={`${fmtDate(a.date)} — ${a.status}`} style={{ background: c + '18', border: `1px solid ${c}40`, borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: c, cursor: 'default' }}>
                            {new Date(a.date).getDate()}/{new Date(a.date).getMonth() + 1}
                          </div>
                        );
                      })}
                      {data.attendance.recent.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>No records found.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACADEMIC (students only) ── */}
              {tab === 'Academic' && isStudent && (
                <div>
                  {/* Report Cards */}
                  {data.academic.report_cards.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Finalized Report Cards</h3>
                      {data.academic.report_cards.map(rc => {
                        const g = grade(rc.percentage);
                        return (
                          <div key={rc._id} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div>
                                <span style={{ fontWeight: 700, color: '#1e293b' }}>{rc.term}</span>
                                {rc.academic_year_id && <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{rc.academic_year_id.label}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontSize: 24, fontWeight: 900, color: g.color }}>{g.g}</span>
                                <div style={{ textAlign: 'right' }}>
                                  <p style={{ fontSize: 12, color: '#94a3b8' }}>{rc.total_obtained}/{rc.total_marks}</p>
                                  <p style={{ fontSize: 16, fontWeight: 800, color: g.color }}>{rc.percentage?.toFixed(1)}%</p>
                                </div>
                              </div>
                            </div>
                            <PctBar value={rc.percentage} color={g.color} />
                            {rc.subject_marks?.length > 0 && (
                              <div style={{ marginTop: 14, overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                      {['Subject', 'Obtained', 'Total', '%', 'Grade', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Subject' ? 'left' : 'center', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rc.subject_marks.map((sm, i) => {
                                      const p = sm.total_marks > 0 ? (sm.obtained_marks / sm.total_marks) * 100 : 0;
                                      const sg = grade(p);
                                      return (
                                        <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1e293b' }}>{sm.subject_id?.name || sm.subject_name || '—'}</td>
                                          <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>{sm.obtained_marks}</td>
                                          <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{sm.total_marks}</td>
                                          <td style={{ padding: '7px 10px', textAlign: 'center', color: sg.color, fontWeight: 700 }}>{p.toFixed(0)}%</td>
                                          <td style={{ padding: '7px 10px', textAlign: 'center' }}><span style={{ fontWeight: 800, color: sg.color }}>{sg.g}</span></td>
                                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>{sm.is_pass ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {rc.remarks && <p style={{ marginTop: 10, fontSize: 12, color: '#64748b', fontStyle: 'italic', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>Remarks: {rc.remarks}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Raw marks by term */}
                  {Object.keys(data.academic.by_term).length > 0 ? (
                    Object.entries(data.academic.by_term).map(([term, { entries }]) => (
                      <div key={term} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
                        <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>{term} — Exam Marks</h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                {['Subject', 'Exam', 'Date', 'Obtained', 'Total', 'Pass Marks', '%', 'Status'].map(h => (
                                  <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Subject' || h === 'Exam' ? 'left' : 'center', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map((e, i) => {
                                const pct = e.obtained != null && e.total > 0 ? (e.obtained / e.total) * 100 : null;
                                const sg = pct != null ? grade(pct) : null;
                                return (
                                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1e293b' }}>{e.subject}</td>
                                    <td style={{ padding: '7px 10px', color: '#475569' }}>{e.exam_label}</td>
                                    <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{fmtDate(e.exam_date)}</td>
                                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>{e.is_absent ? '—' : e.obtained}</td>
                                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{e.total}</td>
                                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{e.passing}</td>
                                    <td style={{ padding: '7px 10px', textAlign: 'center', color: sg?.color, fontWeight: 700 }}>{pct != null ? `${pct.toFixed(0)}%` : '—'}</td>
                                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                      {e.is_absent ? <Badge color="#94a3b8">Absent</Badge>
                                        : pct != null ? (pct >= (e.passing / e.total * 100) ? <Badge color="#10b981">Pass</Badge> : <Badge color="#ef4444">Fail</Badge>)
                                        : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    data.academic.report_cards.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', paddingTop: 40 }}>No academic records found.</p>
                  )}
                </div>
              )}

              {/* ── FEES (students only) ── */}
              {tab === 'Fees' && isStudent && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
                    <StatCard label="Total Billed" value={`Rs. ${fmt(data.fees.summary.total)}`} sub={`${data.fees.summary.invoice_count} invoices`} color="#0891b2" icon={FileText} />
                    <StatCard label="Total Paid" value={`Rs. ${fmt(data.fees.summary.paid)}`} color="#10b981" icon={CheckCircle} />
                    <StatCard label="Balance Due" value={`Rs. ${fmt(data.fees.summary.balance)}`} sub={`${data.fees.summary.overdue_count} overdue`} color={data.fees.summary.balance > 0 ? '#ef4444' : '#10b981'} icon={Wallet} />
                  </div>

                  <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Invoice History</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['Month', 'Total', 'Paid', 'Balance', 'Due Date', 'Status'].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Month' ? 'left' : 'center', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.fees.invoices.map(inv => {
                            const sColor = { paid: '#10b981', partial: '#f59e0b', unpaid: '#ef4444' }[inv.status] || '#94a3b8';
                            return (
                              <tr key={inv._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{monthLabel(inv.month)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>Rs. {fmt(inv.total_amount)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>Rs. {fmt(inv.paid_amount)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: inv.balance > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>Rs. {fmt(inv.balance)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>{fmtDate(inv.due_date)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}><Badge color={sColor}>{inv.status}</Badge></td>
                              </tr>
                            );
                          })}
                          {data.fees.invoices.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No invoices found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CONDUCT (students only) ── */}
              {tab === 'Conduct' && isStudent && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
                    <StatCard label="Merit Points" value={`+${data.conduct.summary.merit}`} color="#10b981" icon={TrendingUp} />
                    <StatCard label="Demerit Points" value={`-${data.conduct.summary.demerit}`} color="#ef4444" icon={MinusCircle} />
                    <StatCard label="Net Score" value={`${data.conduct.summary.net >= 0 ? '+' : ''}${data.conduct.summary.net}`} color={data.conduct.summary.net >= 0 ? '#10b981' : '#ef4444'} icon={BarChart2} />
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Conduct Records</h4>
                    {data.conduct.records.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No conduct records.</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.conduct.records.map(c => (
                          <div key={c._id} style={{ borderRadius: 8, padding: '10px 14px', background: c.type === 'positive' ? '#f0fdf4' : '#fef2f2', borderLeft: `3px solid ${c.type === 'positive' ? '#10b981' : '#ef4444'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{c.title}</span>
                                <Badge color={c.type === 'positive' ? '#10b981' : '#ef4444'} style={{ marginLeft: 8 }}>{c.category?.replace('_', ' ')}</Badge>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 800, color: c.type === 'positive' ? '#10b981' : '#ef4444' }}>{c.type === 'positive' ? '+' : '-'}{c.points}</span>
                            </div>
                            {c.description && <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.description}</p>}
                            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{fmtDate(c.incident_date)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── PAYROLL (staff only) ── */}
              {tab === 'Payroll' && !isStudent && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
                    <StatCard label="Total Paid" value={`Rs. ${fmt(data.payroll.summary.total_paid)}`} sub={`${data.payroll.summary.months_count} months`} color="#10b981" icon={DollarSign} />
                    <StatCard label="Deductions" value={`Rs. ${fmt(data.payroll.summary.total_deductions)}`} color="#ef4444" icon={MinusCircle} />
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Payroll History</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['Month', 'Basic', 'Deductions', 'Net Salary', 'Status'].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Month' ? 'left' : 'center', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.payroll.records.map(p => (
                            <tr key={p._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{monthLabel(p.month)}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>Rs. {fmt(p.basic_salary || p.salary?.amount)}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ef4444' }}>Rs. {fmt(p.deductions?.reduce?.((a, d) => a + (d.amount || 0), 0) || 0)}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>Rs. {fmt(p.net_salary)}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}><Badge color={p.is_paid ? '#10b981' : '#f59e0b'}>{p.is_paid ? 'Paid' : 'Pending'}</Badge></td>
                            </tr>
                          ))}
                          {data.payroll.records.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No payroll records.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── LEAVE (both) ── */}
              {tab === 'Leave' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
                    <StatCard label="Approved" value={data.leave.summary.approved} sub={`${data.leave.summary.total_days_taken} days`} color="#10b981" icon={CheckCircle} />
                    <StatCard label="Pending" value={data.leave.summary.pending} color="#f59e0b" icon={Clock} />
                    <StatCard label="Rejected" value={data.leave.summary.rejected} color="#ef4444" icon={XCircle} />
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Leave Applications</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.leave.records.map(l => {
                        const sColor = { approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444' }[l.status] || '#94a3b8';
                        return (
                          <div key={l._id} style={{ borderRadius: 8, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{l.leave_type?.replace('_', ' ')}</span>
                                <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{fmtDate(l.from_date)} – {fmtDate(l.to_date)}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: '#64748b' }}>{l.total_days} day{l.total_days !== 1 ? 's' : ''}</span>
                                <Badge color={sColor}>{l.status}</Badge>
                              </div>
                            </div>
                            {l.reason && <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{l.reason}</p>}
                            {l.rejection_reason && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Rejection: {l.rejection_reason}</p>}
                          </div>
                        );
                      })}
                      {data.leave.records.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>No leave applications.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── FINES (both) ── */}
              {tab === 'Fines' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
                    <StatCard label="Total Fines" value={`Rs. ${fmt(data.fines.summary.issued)}`} sub={`${data.fines.summary.count} issued`} color="#f59e0b" icon={AlertTriangle} />
                    <StatCard label="Paid" value={`Rs. ${fmt(data.fines.summary.paid)}`} color="#10b981" icon={CheckCircle} />
                    <StatCard label="Pending" value={`Rs. ${fmt(data.fines.summary.pending)}`} color="#ef4444" icon={Clock} />
                    {isStudent && <StatCard label="Waived" value={`Rs. ${fmt(data.fines.summary.waived)}`} color="#6366f1" icon={MinusCircle} />}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Fine Records</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.fines.records.map(f => {
                        const sColor = { paid: '#10b981', pending: '#ef4444', waived: '#6366f1' }[f.status] || '#94a3b8';
                        return (
                          <div key={f._id} style={{ borderRadius: 8, padding: '10px 14px', background: '#fef9ec', border: '1px solid #fde68a' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{f.category?.replace('_', ' ')}</span>
                                <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{fmtDate(f.issued_date)}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, color: '#d97706' }}>Rs. {fmt(f.amount)}</span>
                                <Badge color={sColor}>{f.status}</Badge>
                              </div>
                            </div>
                            {f.reason && <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{f.reason}</p>}
                          </div>
                        );
                      })}
                      {data.fines.records.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>No fine records.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ADVANCES (staff only) ── */}
              {tab === 'Advances' && !isStudent && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
                    <StatCard label="Total Advances" value={`Rs. ${fmt(data.advances.summary.total)}`} sub={`${data.advances.summary.count} requests`} color="#0891b2" icon={FileText} />
                    <StatCard label="Recovered" value={`Rs. ${fmt(data.advances.summary.recovered)}`} color="#10b981" icon={CheckCircle} />
                    <StatCard label="Outstanding" value={`Rs. ${fmt(data.advances.summary.outstanding)}`} color="#ef4444" icon={AlertTriangle} />
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 12 }}>Advance Records</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.advances.records.map(a => {
                        const sColor = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', recovered: '#6366f1' }[a.status] || '#94a3b8';
                        return (
                          <div key={a._id} style={{ borderRadius: 8, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>Rs. {fmt(a.amount)} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>— {fmtDate(a.date)}</span></span>
                              <Badge color={sColor}>{a.status}</Badge>
                            </div>
                            {a.reason && <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{a.reason}</p>}
                            {a.recovered_amount > 0 && <p style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>Recovered: Rs. {fmt(a.recovered_amount)}</p>}
                          </div>
                        );
                      })}
                      {data.advances.records.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>No advance records.</p>}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── PersonCard ────────────────────────────────────────────────────────────

function PersonCard({ person, onClick }) {
  const isStudent = person.type === 'student';
  const accent = isStudent ? '#6366f1' : '#0891b2';
  const attOk = person.attendance_pct != null;
  const attColor = attOk ? (person.attendance_pct >= 75 ? '#10b981' : person.attendance_pct >= 50 ? '#f59e0b' : '#ef4444') : '#94a3b8';

  return (
    <button
      onClick={() => onClick(person)}
      style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%', display: 'flex', alignItems: 'center', gap: 14 }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Avatar */}
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
        {person.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</p>
        <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isStudent ? (person.sub || 'No class') : person.sub?.replace('_', ' ')}
          {isStudent && person.roll_number ? ` · #${person.roll_number}` : ''}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        {attOk && (
          <span style={{ fontSize: 12, fontWeight: 700, color: attColor }}>{person.attendance_pct}% att.</span>
        )}
        {isStudent && person.fee_balance > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>Rs. {fmt(person.fee_balance)} due</span>
        )}
      </div>

      <ChevronRight size={16} color="#cbd5e1" />
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function Reports() {
  const [data, setData]         = useState({ students: [], staff: [] });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [tab, setTab]           = useState('students');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/reports/people')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.message || 'Failed to load'); setLoading(false); });
  }, []);

  const list = (tab === 'students' ? data.students : data.staff).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.roll_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sub || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Reports</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Click any person to view their full report card</p>
      </div>

      {/* Search + Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tab}…`}
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, gap: 2 }}>
          {[
            { key: 'students', label: 'Students', icon: Users,    count: data.students.length },
            { key: 'staff',    label: 'Staff',    icon: Briefcase, count: data.staff.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => { setTab(key); setSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#1e293b' : '#64748b', boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
              <Icon size={15} /> {label}
              <span style={{ background: tab === key ? '#6366f1' : '#e2e8f0', color: tab === key ? '#fff' : '#64748b', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
          {tab === 'students' ? <>
            <StatCard label="Total Students" value={data.students.length} color="#6366f1" icon={Users} />
            <StatCard label="Avg Attendance" value={(() => { const v = data.students.filter(s => s.attendance_pct != null); return v.length ? Math.round(v.reduce((a, s) => a + s.attendance_pct, 0) / v.length) + '%' : '—'; })()} color="#10b981" icon={CalendarCheck} />
            <StatCard label="Total Fee Due" value={`Rs. ${fmt(data.students.reduce((a, s) => a + (s.fee_balance || 0), 0))}`} color="#ef4444" icon={Wallet} />
          </> : <>
            <StatCard label="Total Staff" value={data.staff.length} color="#0891b2" icon={Briefcase} />
            <StatCard label="Avg Attendance" value={(() => { const v = data.staff.filter(s => s.attendance_pct != null); return v.length ? Math.round(v.reduce((a, s) => a + s.attendance_pct, 0) / v.length) + '%' : '—'; })()} color="#10b981" icon={CalendarCheck} />
          </>}
        </div>
      )}

      {/* List */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: '#6366f1' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
        </div>
      )}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, color: '#dc2626' }}>{error}</div>}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <Users size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No {tab} found{search ? ` for "${search}"` : ''}.</p>
            </div>
          ) : (
            list.map(p => <PersonCard key={p._id} person={p} onClick={setSelected} />)
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selected && <ReportDetail person={selected} onClose={() => setSelected(null)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
