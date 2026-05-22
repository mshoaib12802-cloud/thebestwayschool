import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import { QRCodeCanvas } from 'qrcode.react';
import { createPortal } from 'react-dom';
import { generateCertificate } from '../utils/generateCertificate';
import {
  UserPlus, Search, GraduationCap, Clock,
  Trash2, Edit2, X, DollarSign, CheckCircle2, Phone,
  Download, User, Calendar, Award, Key, Copy, RefreshCw
} from 'lucide-react';

const Students = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'alumni'

  const [showFormModal, setShowFormModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState('All');

  const initialForm = {
    full_name: '', father_name: '', phone: '', guardian_phone: '',
    email: '',
    course_id: '', course_name: '', duration: '6 Months', shift: 'Morning',
    total_fee: '', monthly_fee: '', admission_date: new Date().toISOString().split('T')[0],
    trainer_id: '', visitor_id: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);

  useEffect(() => { fetchStudents(); fetchTrainers(); fetchCourses(); }, []);

  // Auto-open form when navigated from Reception with pre-filled data
  useEffect(() => {
    const name = searchParams.get('name');
    if (name) {
      setFormData(prev => ({
        ...prev,
        full_name: name,
        phone: searchParams.get('phone') || '',
        course_name: searchParams.get('course') || '',
        visitor_id: searchParams.get('visitor_id') || ''
      }));
      setEditId(null);
      setShowFormModal(true);
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = (showFormModal || showProfileModal || showCredentialsModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showFormModal, showProfileModal, showCredentialsModal]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/students');
      setStudents(data);
    } catch (error) { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const fetchTrainers = async () => {
    try {
      const { data } = await api.get('/staff/trainers');
      setTrainers(data);
    } catch (error) { /* trainers list optional */ }
  };

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data.filter(c => c.is_active));
    } catch { /* optional */ }
  };

  const handleGraduate = async (student) => {
    if (!await confirm(`Mark ${student.full_name} as graduated? This cannot be undone.`, { title: 'Graduate Student', confirmText: 'Graduate', danger: false })) return;
    try {
      await api.put(`/students/${student._id}/graduate`);
      toast.success(`${student.full_name} graduated!`);
      setShowProfileModal(false);
      fetchStudents();
    } catch { toast.error('Failed to graduate student'); }
  };

  const printStudentID = () => {
    const doc = new jsPDF({ unit: 'mm', format: [85.6, 54] }); // Standard ID card size
    // Background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 85.6, 54, 'F');
    // Header bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 85.6, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('INFLORESCENCE', 42.8, 6, { align: 'center' });
    doc.setFontSize(5);
    doc.text('STUDENT IDENTITY CARD', 42.8, 11, { align: 'center' });
    // Avatar circle
    doc.setFillColor(79, 70, 229);
    doc.circle(14, 32, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(selectedStudent.full_name.charAt(0).toUpperCase(), 14, 35.5, { align: 'center' });
    // Student info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(selectedStudent.full_name, 27, 21);
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(selectedStudent.roll_number, 27, 27);
    doc.text(selectedStudent.courses[0]?.course_name || '', 27, 32);
    doc.text(`${selectedStudent.courses[0]?.shift || ''} — ${selectedStudent.courses[0]?.duration || ''}`, 27, 37);
    // QR code from canvas
    const canvas = document.getElementById('qr-gen');
    if (canvas) {
      const qrImg = canvas.toDataURL('image/png');
      doc.addImage(qrImg, 'PNG', 64, 16, 19, 19);
    }
    // Footer
    doc.setFillColor(226, 232, 240);
    doc.rect(0, 47, 85.6, 7, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(5);
    doc.text(`Issued: ${new Date().getFullYear()} | Valid for current session`, 42.8, 51.5, { align: 'center' });
    doc.save(`${selectedStudent.full_name}_ID_Card.pdf`);
    toast.success('ID Card Downloaded!');
  };

  const downloadCertificate = () => {
    generateCertificate(selectedStudent);
    toast.success('Certificate Downloaded!');
  };

  const handleCourseSelect = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    if (!course) return setFormData({ ...formData, course_id: '', course_name: '', total_fee: '', monthly_fee: '', duration: '6 Months', trainer_id: '' });
    // Auto-fill trainer if one is assigned to this course
    const assignedTrainer = trainers.find(t => (t.assigned_courses || []).includes(course.name));
    setFormData({
      ...formData,
      course_id: course._id,
      course_name: course.name,
      total_fee: course.total_fee,
      monthly_fee: course.monthly_fee,
      duration: course.duration,
      trainer_id: assignedTrainer ? assignedTrainer._id : formData.trainer_id
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/students/${editId}`, formData);
        toast.success('Student Updated Successfully');
        setShowFormModal(false);
        setEditId(null);
        setFormData(initialForm);
        fetchStudents();
      } else {
        const { data } = await api.post('/students/add', formData);
        toast.success('Student enrolled! Credentials sent to their Gmail.');
        setShowFormModal(false);
        setEditId(null);
        setFormData(initialForm);
        fetchStudents();
        if (data.credentials) {
          setNewCredentials(data.credentials);
          setShowCredentialsModal(true);
        }
      }
    } catch (error) { toast.error('Operation Failed'); }
  };

  const handleResetCredentials = async (studentId) => {
    try {
      const { data } = await api.get(`/students/${studentId}/credentials`);
      setNewCredentials(data);
      setShowCredentialsModal(true);
    } catch { toast.error('Failed to reset credentials'); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); 
    if (!await confirm('All attendance and fee records will be permanently deleted.', { title: 'Delete Student' })) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student Deleted');
      fetchStudents();
    } catch (error) { toast.error('Delete Failed'); }
  };

  const openEditModal = (student, e) => {
    e.stopPropagation();
    const c = student.courses[0];
    setFormData({
      full_name: student.full_name,
      father_name: student.father_name,
      phone: student.phone,
      guardian_phone: student.guardian_phone,
      email: student.email || '',
      course_id: c?.course_id || '',
      course_name: c?.course_name || '',
      duration: c?.duration || '',
      shift: c?.shift || 'Morning',
      total_fee: c?.total_fee || '',
      monthly_fee: c?.monthly_fee || '',
      admission_date: c?.admission_date ? c.admission_date.split('T')[0] : '',
      trainer_id: c?.trainer_id?._id || c?.trainer_id || ''
    });
    setEditId(student._id);
    setShowFormModal(true);
  };

  const openProfile = (student) => {
    setSelectedStudent(student);
    setShowProfileModal(true);
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-gen');
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${selectedStudent.full_name}_QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const filteredStudents = students.filter(s => {
    const matchTab = activeTab === 'active' ? s.isActive !== false : s.isActive === false;
    const matchSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchShift = filterShift === 'All' || s.courses[0]?.shift === filterShift;
    return matchTab && matchSearch && matchShift;
  });

  // ─── Shared input style ───────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: '0.75rem', padding: '0.85rem 1rem', fontSize: '0.9rem',
    fontWeight: 500, color: '#334155', outline: 'none', boxSizing: 'border-box'
  };
  const labelStyle = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem'
  };
  const sectionTitleStyle = {
    fontSize: '0.68rem', fontWeight: 700, color: '#3b82f6',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', marginTop: 0
  };

  // ─── ADMISSION FORM MODAL (Portal → renders into document.body) ───────────
  const formModalPortal = createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setShowFormModal(false); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(15,23,42,0.75)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '780px',
        maxHeight: 'calc(100vh - 2rem)',
        backgroundColor: '#fff', borderRadius: '1.75rem',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Static Header ── */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              {editId ? 'Update Profile' : 'New Admission'}
            </h3>
            <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>Enter student details carefully.</p>
          </div>
          <button onClick={() => setShowFormModal(false)} style={{ padding: '0.5rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#64748b', transition: 'all 0.15s' }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, { background: '#fee2e2', color: '#e11d48' })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, { background: '#f1f5f9', color: '#64748b' })}
          >
            <X size={22}/>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '2rem' }}>
          <form onSubmit={handleSubmit}>

            {/* Personal Info */}
            <p style={sectionTitleStyle}>Personal Information</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Full Name', key: 'full_name', placeholder: 'e.g. Ali Khan', required: true },
                { label: 'Father Name', key: 'father_name', placeholder: '' },
                { label: 'Phone', key: 'phone', placeholder: '0300-xxxxxxx', required: true },
                { label: 'Guardian Phone', key: 'guardian_phone', placeholder: '' },
              ].map(({ label, key, placeholder, required }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input required={required} value={formData[key]} placeholder={placeholder}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              ))}
            </div>

            {/* Gmail — required for student portal login */}
            <div style={{ marginBottom: '2rem', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
              <label style={{ ...labelStyle, color: '#1d4ed8' }}>
                Student Gmail Address (Login Username) *
              </label>
              <input
                type="email"
                required={!editId}
                value={formData.email}
                placeholder="student@gmail.com"
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={{ ...inputStyle, borderColor: '#93c5fd' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#93c5fd'}
              />
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#2563eb' }}>
                Login credentials will be sent to this Gmail address automatically.
              </p>
            </div>

            {/* Academic Details */}
            <p style={sectionTitleStyle}>Academic Details</p>
            {courses.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Pick from Course Catalog (auto-fills fees)</label>
                <select
                  onChange={e => handleCourseSelect(e.target.value)}
                  style={{ ...inputStyle, color: '#3b82f6', fontWeight: 700 }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="">— Select a course —</option>
                  {courses.map(c => {
                    const t = trainers.find(tr => (tr.assigned_courses || []).includes(c.name));
                    return (
                      <option key={c._id} value={c._id}>
                        {c.name} · {c.duration} · Rs. {c.total_fee?.toLocaleString()}{t ? ` · Teacher: ${t.name}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Course Name</label>
                <input required value={formData.course_name} placeholder="e.g. Web Development"
                  onChange={e => setFormData({ ...formData, course_name: e.target.value })}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Assign Trainer
                  {formData.trainer_id && trainers.find(t => t._id === formData.trainer_id) && (
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: '#10b981', background: '#d1fae5', padding: '1px 6px', borderRadius: '99px', border: '1px solid #a7f3d0' }}>
                      ✓ Auto-filled
                    </span>
                  )}
                </label>
                <select value={formData.trainer_id}
                  onChange={e => setFormData({ ...formData, trainer_id: e.target.value })}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="">— No Trainer —</option>
                  {trainers.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name}{t.commission_percent > 0 ? ` (${t.commission_percent}% commission)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Duration', key: 'duration', options: ['3 Months', '6 Months', '1 Year', '2 Years'] },
                { label: 'Shift', key: 'shift', options: ['Morning', 'Afternoon', 'Evening', 'Weekend'] },
              ].map(({ label, key, options }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <select value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  >
                    {options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Fee Structure */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
              <p style={{ ...sectionTitleStyle, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={15} color="#10b981"/> Fee Structure
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {[
                  { label: 'Total Course Fee', key: 'total_fee' },
                  { label: 'Monthly Installment', key: 'monthly_fee' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <div style={{ display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', background: '#fff' }}>
                      <span style={{ padding: '0 0.9rem', background: '#e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', alignSelf: 'stretch', borderRight: '1.5px solid #cbd5e1', flexShrink: 0 }}>Rs.</span>
                      <input type="number" min="0" value={formData[key]} placeholder="0"
                        onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                        style={{ flex: 1, padding: '0.85rem 1rem', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', border: 'none', outline: 'none', background: 'transparent', minWidth: 0 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button type="submit"
              style={{ width: '100%', background: '#0f172a', color: '#fff', padding: '1rem', borderRadius: '0.875rem', fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
            >
              <CheckCircle2 size={22} color="#34d399"/>
              {editId ? 'Update Record' : 'Confirm Admission'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );

  // ─── PROFILE MODAL (Portal) ───────────────────────────────────────────────
  const profileModalPortal = selectedStudent ? createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setShowProfileModal(false); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(15,23,42,0.82)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '860px', maxHeight: 'calc(100vh - 2rem)', backgroundColor: '#fff', borderRadius: '2rem', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', display: 'flex', overflow: 'hidden' }}>
        
        {/* Left: ID Card */}
        <div style={{ width: 270, flexShrink: 0, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '2.5rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ background: '#fff', padding: '1.75rem 1.5rem', borderRadius: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#0f172a', color: '#fff', fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
              {selectedStudent.full_name.charAt(0)}
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>{selectedStudent.full_name}</h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500, marginBottom: '1.25rem' }}>{selectedStudent.roll_number}</p>
            <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '0.75rem', border: '2px dashed #cbd5e1', display: 'inline-block', marginBottom: '1rem' }}>
              <QRCodeCanvas id="qr-gen" value={selectedStudent.roll_number} size={110} level="H" includeMargin={true}/>
            </div>
            <button onClick={downloadQR} style={{ width: '100%', padding: '0.65rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              <Download size={15}/> Download QR
            </button>
            <button onClick={printStudentID} style={{ width: '100%', padding: '0.65rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Download size={15}/> Print ID Card
            </button>
          </div>
          <div style={{ position: 'absolute', top: -80, left: -80, width: 220, height: 220, background: 'rgba(99,102,241,0.07)', borderRadius: '50%' }}/>
          <div style={{ position: 'absolute', bottom: -80, right: -80, width: 220, height: 220, background: 'rgba(168,85,247,0.07)', borderRadius: '50%' }}/>
        </div>

        {/* Right: Details */}
        <div style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto', position: 'relative' }}>
          <button onClick={() => setShowProfileModal(false)}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.5rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#64748b' }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, { background: '#fee2e2', color: '#e11d48' })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, { background: '#f1f5f9', color: '#64748b' })}
          >
            <X size={20}/>
          </button>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={22} color="#6366f1"/> Student Profile
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Father Name', value: selectedStudent.father_name || 'N/A' },
              { label: 'Phone', value: selectedStudent.phone, icon: <Phone size={13} color="#94a3b8"/> },
              { label: 'Guardian Phone', value: selectedStudent.guardian_phone || 'N/A', icon: <Phone size={13} color="#94a3b8"/> },
              { label: 'Admission Date', value: selectedStudent.courses[0]?.admission_date ? new Date(selectedStudent.courses[0].admission_date).toLocaleDateString() : 'N/A', icon: <Calendar size={13} color="#94a3b8"/> },
            ].map(({ label, value, icon }) => (
              <div key={label}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, marginTop: 0 }}>{label}</p>
                <p style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>{icon}{value}</p>
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1.5rem 0' }}/>

          <div style={{ background: '#f8fafc', borderRadius: '1rem', border: '1px solid #f1f5f9', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <GraduationCap size={15} color="#f97316"/> Academic Details
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Enrolled Course</p>
                <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b', margin: 0 }}>{selectedStudent.courses[0]?.course_name}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Shift & Duration</p>
                <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>{selectedStudent.courses[0]?.shift} • {selectedStudent.courses[0]?.duration}</p>
              </div>
              {selectedStudent.courses[0]?.trainer_id && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Assigned Trainer</p>
                  <p style={{ fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700 }}>
                      {selectedStudent.courses[0].trainer_id?.name || trainers.find(t => t._id === selectedStudent.courses[0].trainer_id)?.name || 'Trainer'}
                    </span>
                    {selectedStudent.courses[0].trainer_commission_percent > 0 && (
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                        {selectedStudent.courses[0].trainer_commission_percent}% Commission
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Batch Info */}
              {(() => {
                const batch = selectedStudent.courses[0]?.batch_id;
                if (!batch) return (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Batch</p>
                    <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '3px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>Not assigned to any batch</span>
                  </div>
                );
                const shiftColors = { Morning: '#fef3c7', Afternoon: '#dbeafe', Evening: '#ede9fe', Weekend: '#dcfce7' };
                const shiftText = { Morning: '#92400e', Afternoon: '#1e40af', Evening: '#4c1d95', Weekend: '#14532d' };
                return (
                  <div style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem', marginTop: 0 }}>Batch</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{batch.name}</p>
                        {(batch.start_date || batch.end_date) && (
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                            {batch.start_date ? new Date(batch.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                            {' → '}
                            {batch.end_date ? new Date(batch.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                          </p>
                        )}
                      </div>
                      {batch.shift && (
                        <span style={{ background: shiftColors[batch.shift] || '#f1f5f9', color: shiftText[batch.shift] || '#475569', padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>
                          {batch.shift}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '1rem', padding: '1.25rem' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: 6, marginTop: 0 }}>Monthly Fee</p>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: 0 }}>Rs. {(selectedStudent.courses[0]?.monthly_fee || 0).toLocaleString()}</p>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '1rem', padding: '1.25rem' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: 6, marginTop: 0 }}>Total Fee</p>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d4ed8', margin: 0 }}>Rs. {(selectedStudent.courses[0]?.total_fee || 0).toLocaleString()}</p>
            </div>
          </div>

          {selectedStudent.isActive !== false ? (
            <button
              onClick={() => handleGraduate(selectedStudent)}
              style={{ width: '100%', padding: '0.9rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '0.875rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
            >
              🎓 Mark as Graduated
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.875rem', padding: '0.75rem', textAlign: 'center', color: '#15803d', fontWeight: 700, fontSize: '0.88rem' }}>
                ✓ Graduated — {selectedStudent.courses[0]?.completion_date ? new Date(selectedStudent.courses[0].completion_date).toLocaleDateString() : ''}
              </div>
              <button
                onClick={downloadCertificate}
                style={{ width: '100%', padding: '0.9rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.875rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
              >
                <Award size={18}/> Download Certificate PDF
              </button>
            </div>
          )}
          <button
            onClick={() => { setShowProfileModal(false); handleResetCredentials(selectedStudent._id); }}
            style={{ width: '100%', marginTop: 10, padding: '0.75rem', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '0.875rem', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <RefreshCw size={16}/> Reset Login Credentials
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  const credentialsModalPortal = showCredentialsModal && newCredentials ? createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#fff', borderRadius: '2rem', boxShadow: '0 40px 100px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Key size={28} color="#fff"/>
          </div>
          <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Login Credentials Generated</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '0.4rem' }}>✅ Credentials have been emailed to the student's Gmail. Also shown below for reference.</p>
        </div>
        <div style={{ padding: '2rem' }}>
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem' }}>Roll Number</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0, fontFamily: 'monospace' }}>{newCredentials.roll_number}</p>
          </div>
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem' }}>Login Email</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#4f46e5', margin: 0, fontFamily: 'monospace' }}>{newCredentials.email}</p>
              <button onClick={() => { navigator.clipboard.writeText(newCredentials.email); toast.success('Email copied!'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><Copy size={16}/></button>
            </div>
          </div>
          <div style={{ background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem' }}>Password (save this!)</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#92400e', margin: 0, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{newCredentials.password}</p>
              <button onClick={() => { navigator.clipboard.writeText(newCredentials.password); toast.success('Password copied!'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', padding: 4 }}><Copy size={16}/></button>
            </div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(`Login Portal: ${window.location.origin}/login\nEmail: ${newCredentials.email}\nPassword: ${newCredentials.password}`); toast.success('All credentials copied!'); }}
            style={{ width: '100%', background: '#4f46e5', color: '#fff', padding: '0.9rem', borderRadius: '0.875rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Copy size={18}/> Copy All Credentials
          </button>
          <button onClick={() => setShowCredentialsModal(false)}
            style={{ width: '100%', background: '#f1f5f9', color: '#475569', padding: '0.9rem', borderRadius: '0.875rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
            Done — I've saved these
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>Student portal: <strong>/login</strong> → redirects to student dashboard</p>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
             <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><GraduationCap size={28} /></div>
             Student Directory
          </h2>
          <p className="text-slate-500 mt-1 ml-1 font-medium">
          Active: {students.filter(s => s.isActive !== false).length} • Alumni: {students.filter(s => s.isActive === false).length}
        </p>
        </div>
        <button 
          onClick={() => { setEditId(null); setFormData(initialForm); setShowFormModal(true); }}
          className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-slate-300 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-2"
        >
          <UserPlus size={20}/> New Admission
        </button>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex gap-3 flex-wrap">
           <div className="flex bg-slate-900 p-1.5 rounded-2xl">
             <button onClick={() => setActiveTab('active')} className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>Active</button>
             <button onClick={() => setActiveTab('alumni')} className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'alumni' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>Alumni 🎓</button>
           </div>
           <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
             {['All', 'Morning', 'Evening', 'Weekend'].map(shift => (
               <button key={shift} onClick={() => setFilterShift(shift)}
                 className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${filterShift === shift ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
               >{shift}</button>
             ))}
           </div>
         </div>
         <div className="relative w-full max-w-sm group">
            <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20}/>
            <input className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
              placeholder="Search by Name or Roll No..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            />
         </div>
      </div>

      {/* --- STUDENTS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {filteredStudents.map(student => {
            const course = student.courses[0] || {};
            return (
              <div key={student._id} onClick={() => openProfile(student)}
                className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden cursor-pointer"
              >
                 <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 pointer-events-none ${course.shift === 'Morning' ? 'bg-orange-500' : 'bg-indigo-600'}`}></div>
                 <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                       <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl font-bold text-slate-600 border border-slate-200 shadow-sm">
                          {student.full_name.charAt(0)}
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{student.full_name}</h3>
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg mt-1 inline-block border border-slate-200">{student.roll_number}</span>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={(e) => openEditModal(student, e)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={18}/></button>
                       <button onClick={(e) => handleDelete(student._id, e)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                    </div>
                 </div>
                 <div className="space-y-3 mb-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                       <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><GraduationCap size={16}/></div>
                       <span className="font-semibold">{course.course_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                       <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><Clock size={16}/></div>
                       <span className="font-medium">{course.shift} • {course.duration}</span>
                    </div>
                    {course.trainer_id && (
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                         <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><User size={16}/></div>
                         <span className="font-medium">{course.trainer_id?.name || trainers.find(t => t._id === course.trainer_id)?.name || 'Trainer Assigned'}</span>
                      </div>
                    )}
                 </div>

                 {/* Fee Balance Bar */}
                 {course.total_fee > 0 && (() => {
                   const paid = student.total_paid || 0;
                   const total = course.total_fee || 0;
                   const pct = Math.min(100, Math.round((paid / total) * 100));
                   const balance = total - paid;
                   return (
                     <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                         <span>Fee Paid</span>
                         <span className={balance > 0 ? 'text-rose-500' : 'text-emerald-600'}>
                           {balance > 0 ? `Rs. ${balance.toLocaleString()} due` : '✓ Cleared'}
                         </span>
                       </div>
                       <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                         <div
                           className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                           style={{ width: `${pct}%` }}
                         />
                       </div>
                       <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                         <span>Rs. {paid.toLocaleString()}</span>
                         <span>{pct}% of Rs. {total.toLocaleString()}</span>
                       </div>
                     </div>
                   );
                 })()}
              </div>
            )
         })}
      </div>

      {showFormModal && formModalPortal}
      {showProfileModal && profileModalPortal}
      {credentialsModalPortal}

    </div>
  );
};

export default Students;