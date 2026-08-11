import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  UserPlus, Search, Trash2, Edit2, X, Key, Copy, RefreshCw,
  ChevronRight, ChevronLeft, Camera, User, Users, BookOpen,
  MapPin, AlertCircle, School, CheckCircle2, Eye, EyeOff,
  Phone, Calendar, Heart, Bus, Receipt, Printer, CheckSquare,
  Square, Tag, BadgePercent, FileText,
} from 'lucide-react';
import localLogo from '../assets/logo2.jpeg';

const API_BASE = '';

const BLOOD_GROUPS    = ['Unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'];
const RELIGIONS       = ['Islam','Christianity','Hinduism','Sikhism','Other'];
const PROVINCES       = ['Punjab','Sindh','KPK','Balochistan','Gilgit-Baltistan','AJK','Islamabad'];
const SUBJECT_GROUPS  = [
  { value: 'None',             label: 'None (Primary / Middle)' },
  { value: 'Pre-Medical',      label: 'Pre-Medical  (Bio, Chem, Phy)' },
  { value: 'Pre-Engineering',  label: 'Pre-Engineering  (Math, Phy, Chem)' },
  { value: 'Computer Science', label: 'Computer Science  (CS, Math, Phy)' },
  { value: 'Arts',             label: 'Arts / Humanities' },
  { value: 'Commerce',         label: 'Commerce  (Accounts, Economics)' },
  { value: 'General Science',  label: 'General Science' },
];

const TABS = [
  { id: 'personal',  label: 'Personal',     icon: User },
  { id: 'family',    label: 'Family',       icon: Users },
  { id: 'academic',  label: 'Academic',     icon: BookOpen },
  { id: 'address',   label: 'Address',      icon: MapPin },
  { id: 'previous',  label: 'Prev. School', icon: School },
  { id: 'medical',   label: 'Medical',      icon: Heart },
  { id: 'fees',      label: 'Fees',         icon: Receipt },
];

const EMPTY_FORM = {
  // Personal
  full_name: '', dob: '', place_of_birth: '',
  gender: 'male', religion: 'Islam', nationality: 'Pakistani',
  domicile: '', blood_group: 'Unknown', b_form_no: '',
  // Family
  father_name: '', father_cnic: '', father_phone: '', father_occupation: '', father_employer: '',
  mother_name: '', mother_cnic: '', mother_phone: '', mother_occupation: '',
  guardian_name: '', guardian_phone: '', guardian_relation: '',
  // Academic
  school_class_id: '', section: '', academic_year_id: '', medium: 'English',
  subject_group: 'None',
  admission_date: new Date().toISOString().split('T')[0], siblings_in_school: 0,
  // Address
  address: '', city: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  // Previous School
  previous_school: '', previous_class: '', leaving_certificate_no: '', transfer_reason: '',
  // Medical
  disability: '', allergies: '', transport_required: false,
  // Login
  email: '',
};

const Label = ({ children, required }) => (
  <label className="block text-xs font-semibold text-slate-600 mb-1">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const Input = ({ label, required, ...props }) => (
  <div>
    {label && <Label required={required}>{label}</Label>}
    <input
      {...props}
      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
    />
  </div>
);

const Select = ({ label, required, children, ...props }) => (
  <div>
    {label && <Label required={required}>{label}</Label>}
    <select
      {...props}
      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
    >
      {children}
    </select>
  </div>
);

export default function Admissions() {
  const [students, setStudents]         = useState([]);
  const [classes, setClasses]           = useState([]);
  const [years, setYears]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('active');
  const [search, setSearch]             = useState('');
  const [filterClass, setFilterClass]   = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [formTab, setFormTab]           = useState('personal');
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile]       = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [credentials, setCredentials]   = useState(null);
  const [showProfile, setShowProfile]   = useState(null);
  const photoRef = useRef();

  // ── Fee tab state ────────────────────────────────────────────────────────
  // undefined = never loaded, null = loaded but none found, object = found
  const [feeStructure,    setFeeStructure]    = useState(undefined);
  const [feeLoading,      setFeeLoading]      = useState(false);
  const [selectedFees,    setSelectedFees]    = useState({});
  const [feeDiscount,     setFeeDiscount]     = useState('');
  const [feePaid,         setFeePaid]         = useState('');
  const [feePayMethod,    setFeePayMethod]    = useState('cash');
  const [feeNotes,        setFeeNotes]        = useState('');
  const [printSlip,       setPrintSlip]       = useState(null);
  const printRef = useRef();

  // ── Family lookup state ──────────────────────────────────────────────────
  const [familyMatches,   setFamilyMatches]   = useState([]);   // siblings found by phone
  const [familySearching, setFamilySearching] = useState(false);
  const [confirmedSibIds, setConfirmedSibIds] = useState(new Set()); // confirmed sibling _ids
  const familySearchRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/students'),
      api.get('/school-classes'),
      api.get('/academic-years'),
    ]).then(([s, c, y]) => {
      setStudents(Array.isArray(s.data) ? s.data : (s.data?.students || []));
      setClasses(c.data || []);
      setYears(y.data || []);
    }).catch(err => {
      console.error('Admissions load error:', err);
      toast.error('Failed to load data');
    }).finally(() => setLoading(false));
  }, []);

  // ── Family lookup: debounce on father_phone / mother_phone ──────────────
  useEffect(() => {
    const phone = form.father_phone || form.mother_phone;
    const clean = phone?.replace(/[^0-9]/g, '') || '';
    if (clean.length < 9) {
      setFamilyMatches([]);
      return;
    }
    clearTimeout(familySearchRef.current);
    familySearchRef.current = setTimeout(async () => {
      setFamilySearching(true);
      try {
        const { data } = await api.get('/students/family-lookup', { params: { phone: clean } });
        // Exclude the student being edited from results
        const matches = (data.students || []).filter(s => s._id !== editId);
        setFamilyMatches(matches);
        // Pre-confirm all found siblings
        setConfirmedSibIds(new Set(matches.map(s => s._id)));
        // Auto-update siblings_in_school count
        if (matches.length > 0) {
          setField('siblings_in_school', matches.length);
        }
      } catch {
        setFamilyMatches([]);
      } finally {
        setFamilySearching(false);
      }
    }, 600);
    return () => clearTimeout(familySearchRef.current);
  }, [form.father_phone, form.mother_phone]);

  const applyFamilyData = (family) => {
    if (!family) return;
    setForm(f => ({
      ...f,
      father_name:       family.father_name       || f.father_name,
      father_cnic:       family.father_cnic        || f.father_cnic,
      father_phone:      family.father_phone       || f.father_phone,
      father_occupation: family.father_occupation  || f.father_occupation,
      father_employer:   family.father_employer    || f.father_employer,
      mother_name:       family.mother_name        || f.mother_name,
      mother_cnic:       family.mother_cnic        || f.mother_cnic,
      mother_phone:      family.mother_phone       || f.mother_phone,
      mother_occupation: family.mother_occupation  || f.mother_occupation,
      address:           family.address            || f.address,
      city:              family.city               || f.city,
    }));
    toast.success('Family data filled in automatically');
  };

  // Auto-fetch fee structure when user opens the Fees tab
  useEffect(() => {
    if (formTab !== 'fees' || !showForm) return;
    if (!form.school_class_id || !form.academic_year_id) return;
    if (feeStructure !== undefined || feeLoading) return; // already loaded or loading
    fetchFeeStructure(form.school_class_id, form.academic_year_id);
  }, [formTab, showForm, form.school_class_id, form.academic_year_id]);

  const setField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    // Reset fee structure when class or year changes so it reloads
    if (field === 'school_class_id' || field === 'academic_year_id') {
      setFeeStructure(undefined);
      setSelectedFees({});
    }
  };

  const fetchFeeStructure = async (classId, yearId) => {
    if (!classId || !yearId) return;
    setFeeLoading(true);
    try {
      const { data } = await api.get('/fee-structure/structures', {
        params: { class_id: classId, academic_year_id: yearId },
      });
      const structure = Array.isArray(data) ? (data[0] || null) : (data || null);
      setFeeStructure(structure); // null = none found, object = found
      if (structure?.items?.length) {
        const pre = {};
        structure.items.forEach(item => { pre[item._id] = true; });
        setSelectedFees(pre);
      }
    } catch {
      setFeeStructure(null);
    } finally {
      setFeeLoading(false);
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Photo must be under 3 MB'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const resetFeeState = () => {
    setFeeStructure(undefined);
    setSelectedFees({});
    setFeeDiscount('');
    setFeePaid('');
    setFeePayMethod('cash');
    setFeeNotes('');
    setFamilyMatches([]);
    setConfirmedSibIds(new Set());
    clearTimeout(familySearchRef.current);
  };

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview('');
    setFormTab('personal');
    resetFeeState();
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditId(s._id);
    setForm({
      full_name: s.full_name || '',
      dob: s.dob ? new Date(s.dob).toISOString().split('T')[0] : '',
      place_of_birth: s.place_of_birth || '',
      gender: s.gender || 'male', religion: s.religion || 'Islam',
      nationality: s.nationality || 'Pakistani', domicile: s.domicile || '',
      blood_group: s.blood_group || 'Unknown', b_form_no: s.b_form_no || '',
      father_name: s.father_name || '', father_cnic: s.father_cnic || '',
      father_phone: s.father_phone || '', father_occupation: s.father_occupation || '',
      father_employer: s.father_employer || '',
      mother_name: s.mother_name || '', mother_cnic: s.mother_cnic || '',
      mother_phone: s.mother_phone || '', mother_occupation: s.mother_occupation || '',
      guardian_name: s.guardian_name || '', guardian_phone: s.guardian_phone || '',
      guardian_relation: s.guardian_relation || '',
      school_class_id: s.school_class_id?._id || s.school_class_id || '',
      section: s.section || '',
      academic_year_id: s.academic_year_id?._id || s.academic_year_id || '',
      medium: s.medium || 'English',
      subject_group: s.subject_group || 'None',
      admission_date: s.admission_date ? new Date(s.admission_date).toISOString().split('T')[0] : '',
      siblings_in_school: s.siblings_in_school || 0,
      address: s.address || '', city: s.city || '',
      emergency_contact_name: s.emergency_contact_name || '',
      emergency_contact_phone: s.emergency_contact_phone || '',
      emergency_contact_relation: s.emergency_contact_relation || '',
      previous_school: s.previous_school || '', previous_class: s.previous_class || '',
      leaving_certificate_no: s.leaving_certificate_no || '',
      transfer_reason: s.transfer_reason || '',
      disability: s.disability || '', allergies: s.allergies || '',
      transport_required: s.transport_required || false,
      email: s.email || '',
    });
    setPhotoFile(null);
    setPhotoPreview(s.photo ? `${API_BASE}/uploads/students/${s.photo}` : '');
    setFormTab('personal');
    resetFeeState();
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); setFormTab('personal'); return; }
    if (!form.father_name.trim()) { toast.error('Father name is required'); setFormTab('family'); return; }
    if (!form.school_class_id) { toast.error('Please select a class'); setFormTab('academic'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoFile) fd.append('photo', photoFile);

      if (editId) {
        const { data } = await api.put(`/students/${editId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setStudents(prev => prev.map(s => s._id === editId ? data : s));
        toast.success('Student updated');
        setShowForm(false);
      } else {
        const { data } = await api.post('/students/add', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setStudents(prev => [data.student, ...prev]);

        // ── Generate first-month fee invoice if fee items selected ──────────
        const selItems = feeStructure?.items?.filter(it => selectedFees[it._id]) || [];
        let invoiceData = null;
        if (selItems.length && form.academic_year_id) {
          try {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const discount = Number(feeDiscount) || 0;
            const rawTotal = selItems.reduce((s, it) => s + it.amount, 0);
            const totalAmount = Math.max(0, rawTotal - discount);
            const paidNow = Math.min(Number(feePaid) || 0, totalAmount);

            const invRes = await api.post('/fee-structure/invoices/create-single', {
              student_id:       data.student._id,
              class_id:         form.school_class_id,
              academic_year_id: form.academic_year_id,
              month,
              items: selItems.map(it => ({
                fee_head_id:   it.fee_head_id,
                fee_head_name: it.fee_head_name,
                amount:        it.amount,
              })),
              discount_amount: discount,
              total_amount:    totalAmount,
              paid_amount:     paidNow,
              balance:         totalAmount - paidNow,
              status:          paidNow >= totalAmount ? 'paid' : paidNow > 0 ? 'partial' : 'unpaid',
              notes:           feeNotes,
              payment_method:  feePayMethod,
            });
            invoiceData = invRes.data;
          } catch (err) {
            toast.warn('Student enrolled but invoice generation failed: ' + (err.response?.data?.message || err.message));
          }
        }

        // Build print-slip data
        const cls  = classes.find(c => c._id === form.school_class_id);
        const yr   = years.find(y => y._id === form.academic_year_id);
        setPrintSlip({
          student:    data.student,
          credentials: data.credentials,
          className:  cls ? `${cls.name}–${cls.section || 'A'}` : '—',
          yearLabel:  yr?.label || '—',
          feeItems:   selItems,
          discount:   Number(feeDiscount) || 0,
          totalAmount: selItems.reduce((s, i) => s + i.amount, 0) - (Number(feeDiscount) || 0),
          paidNow:    Math.min(Number(feePaid) || 0, Math.max(0, selItems.reduce((s, i) => s + i.amount, 0) - (Number(feeDiscount) || 0))),
          payMethod:  feePayMethod,
          notes:      feeNotes,
          date:       new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }),
          invoiceId:  invoiceData?._id || null,
        });
        setCredentials(data.credentials);
        setShowForm(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student record? This cannot be undone.')) return;
    try {
      await api.delete(`/students/${id}`);
      setStudents(prev => prev.filter(s => s._id !== id));
      toast.success('Student deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleResetCredentials = async (id) => {
    try {
      const { data } = await api.get(`/students/${id}/credentials`);
      setCredentials(data);
    } catch { toast.error('Failed to reset credentials'); }
  };

  const photoUrl = (s) => s.photo ? `${API_BASE}/uploads/students/${s.photo}` : null;

  const filtered = students
    .filter(s => activeTab === 'active' ? s.isActive : !s.isActive)
    .filter(s => {
      if (filterClass && s.school_class_id?._id !== filterClass && s.school_class_id !== filterClass) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return s.full_name?.toLowerCase().includes(q)
        || s.roll_number?.toLowerCase().includes(q)
        || s.father_name?.toLowerCase().includes(q);
    });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
    </div>
  );

  const activeCount   = students.filter(s => s.isActive).length;
  const alumniCount   = students.filter(s => !s.isActive).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus size={24} className="text-sky-600" /> Student Enrollment
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Pakistani school admission management</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-sky-700 transition-colors">
          <UserPlus size={18} /> Enroll Student
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-semibold uppercase">Total Students</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{students.length}</p>
        </div>
        <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 shadow-sm text-center">
          <p className="text-xs text-sky-700 font-semibold uppercase">Active</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{activeCount}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-semibold uppercase">Alumni</p>
          <p className="text-2xl font-bold text-slate-500 mt-1">{alumniCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, roll no, father..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white" />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
          {['active','alumni'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === t ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Student Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <UserPlus size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No students found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                <th className="text-left px-4 py-3 font-semibold">Student</th>
                <th className="text-left px-4 py-3 font-semibold">Roll No.</th>
                <th className="text-left px-4 py-3 font-semibold">Class</th>
                <th className="text-left px-4 py-3 font-semibold">Father's Name</th>
                <th className="text-left px-4 py-3 font-semibold">Father's Phone</th>
                <th className="text-left px-4 py-3 font-semibold">Gender</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s._id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {photoUrl(s) ? (
                        <img src={photoUrl(s)} alt={s.full_name}
                          className="w-9 h-9 rounded-full object-cover border-2 border-sky-100 flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {s.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-800 leading-tight">{s.full_name}</p>
                        {s.full_name_urdu && <p className="text-xs text-slate-400" dir="rtl">{s.full_name_urdu}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600 bg-slate-50/40">{s.roll_number}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{s.school_class_id?.name || '—'}{s.section && <span className="text-slate-400 text-xs"> ({s.section})</span>}</p>
                    {s.subject_group && s.subject_group !== 'None' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{s.subject_group}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.father_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.father_phone || s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                      {s.gender === 'female' ? 'Female' : 'Male'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setShowProfile(s)} title="View Profile"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors">
                        <Eye size={15}/>
                      </button>
                      <button onClick={() => openEdit(s)} title="Edit"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                        <Edit2 size={15}/>
                      </button>
                      <button onClick={() => handleResetCredentials(s._id)} title="Reset Login"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors">
                        <Key size={15}/>
                      </button>
                      <button onClick={() => handleDelete(s._id)} title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Enrollment / Edit Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">
                  {editId ? 'Edit Student Record' : 'New Student Enrollment'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Fill all sections of the admission form</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
                <X size={22}/>
              </button>
            </div>

            {/* Tab Nav */}
            <div className="flex gap-1 px-6 pt-3 pb-1 overflow-x-auto border-b border-slate-100 shrink-0">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = formTab === t.id;
                return (
                  <button key={t.id} onClick={() => setFormTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${active ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <Icon size={13}/>{t.label}
                  </button>
                );
              })}
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── Personal Tab ─────────────────────────────── */}
              {formTab === 'personal' && (
                <div className="space-y-4">
                  {/* Photo Upload */}
                  <div className="flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <div className="w-24 h-28 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center text-slate-400">
                            <Camera size={22} className="mx-auto mb-1"/>
                            <p className="text-[10px]">Passport Photo</p>
                          </div>
                        )}
                      </div>
                      <button onClick={() => photoRef.current?.click()}
                        className="absolute -bottom-2 -right-2 w-7 h-7 bg-sky-600 text-white rounded-full flex items-center justify-center hover:bg-sky-700 shadow">
                        <Camera size={13}/>
                      </button>
                      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto}/>
                    </div>
                    <div className="flex-1 space-y-3">
                      <Input label="Full Name" required value={form.full_name}
                        onChange={e => setField('full_name', e.target.value)}
                        placeholder="Full name as per B-Form (English)" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Date of Birth" type="date" value={form.dob}
                      onChange={e => setField('dob', e.target.value)} />
                    <Input label="Place of Birth" value={form.place_of_birth}
                      onChange={e => setField('place_of_birth', e.target.value)} placeholder="City, District" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Select label="Gender" required value={form.gender} onChange={e => setField('gender', e.target.value)}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </Select>
                    <Select label="Religion" value={form.religion} onChange={e => setField('religion', e.target.value)}>
                      {RELIGIONS.map(r => <option key={r}>{r}</option>)}
                    </Select>
                    <Select label="Blood Group" value={form.blood_group} onChange={e => setField('blood_group', e.target.value)}>
                      {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Nationality" value={form.nationality}
                      onChange={e => setField('nationality', e.target.value)} />
                    <Select label="Domicile (Province)" value={form.domicile} onChange={e => setField('domicile', e.target.value)}>
                      <option value="">Select province...</option>
                      {PROVINCES.map(p => <option key={p}>{p}</option>)}
                    </Select>
                  </div>

                  <Input label="B-Form No. / Child CNIC" value={form.b_form_no}
                    onChange={e => setField('b_form_no', e.target.value)} placeholder="XXXXX-XXXXXXX-X" />

                  <div className="border-t border-slate-100 pt-3">
                    <Input label="Student Email (for portal login — optional)" type="email" value={form.email}
                      onChange={e => setField('email', e.target.value)} placeholder="student@example.com" />
                    <p className="text-[10px] text-slate-400 mt-1">Leave blank to auto-generate a system login ID.</p>
                  </div>
                </div>
              )}

              {/* ── Family Tab ─────────────────────────────────── */}
              {formTab === 'family' && (
                <div className="space-y-5">

                  {/* ── Sibling Detection Panel ── */}
                  {(familySearching || familyMatches.length > 0) && (
                    <div className={`rounded-2xl border p-4 ${familyMatches.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        {familySearching ? (
                          <>
                            <div className="w-4 h-4 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin"/>
                            <span className="text-xs font-bold text-slate-500">Searching for family members…</span>
                          </>
                        ) : (
                          <>
                            <Users size={15} className="text-emerald-600"/>
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                              {familyMatches.length} Sibling{familyMatches.length !== 1 ? 's' : ''} Already Enrolled
                            </span>
                            <span className="ml-auto text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              Same family detected
                            </span>
                          </>
                        )}
                      </div>

                      {!familySearching && familyMatches.length > 0 && (
                        <>
                          {/* Sibling cards */}
                          <div className="space-y-2 mb-3">
                            {familyMatches.map(sib => (
                              <label key={sib._id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${confirmedSibIds.has(sib._id) ? 'bg-white border-emerald-300' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                                <input type="checkbox"
                                  checked={confirmedSibIds.has(sib._id)}
                                  onChange={() => {
                                    setConfirmedSibIds(prev => {
                                      const next = new Set(prev);
                                      next.has(sib._id) ? next.delete(sib._id) : next.add(sib._id);
                                      setField('siblings_in_school', next.size);
                                      return next;
                                    });
                                  }}
                                  className="w-4 h-4 accent-emerald-600 flex-shrink-0"/>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                  {sib.full_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">{sib.full_name}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {sib.roll_number}
                                    {sib.school_class_id && ` · ${sib.school_class_id.name}–${sib.school_class_id.section || 'A'}`}
                                  </p>
                                </div>
                                {confirmedSibIds.has(sib._id) && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">Sibling ✓</span>
                                )}
                              </label>
                            ))}
                          </div>

                          {/* Auto-fill button */}
                          <button onClick={() => applyFamilyData(familyMatches[0])}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-emerald-700 transition-colors">
                            <CheckCircle2 size={13}/>
                            Auto-fill family data from {familyMatches[0]?.full_name?.split(' ')[0]}'s record
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Hint when no phone entered yet */}
                  {!familySearching && familyMatches.length === 0 && !form.father_phone && !form.mother_phone && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-dashed border-slate-200">
                      <Phone size={12}/>
                      Enter father's or mother's mobile below — if a sibling is already enrolled, their family data will auto-fill.
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-3">Father's Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Father's Full Name" required value={form.father_name}
                        onChange={e => setField('father_name', e.target.value)} />
                      <Input label="Father's CNIC" value={form.father_cnic}
                        onChange={e => setField('father_cnic', e.target.value)} placeholder="XXXXX-XXXXXXX-X" />
                      <Input label="Father's Mobile" value={form.father_phone}
                        onChange={e => setField('father_phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                      <Input label="Occupation" value={form.father_occupation}
                        onChange={e => setField('father_occupation', e.target.value)} />
                      <Input label="Employer / Business" value={form.father_employer}
                        onChange={e => setField('father_employer', e.target.value)} className="col-span-2" />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-pink-600 uppercase tracking-wide mb-3">Mother's Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Mother's Full Name" value={form.mother_name}
                        onChange={e => setField('mother_name', e.target.value)} />
                      <Input label="Mother's CNIC" value={form.mother_cnic}
                        onChange={e => setField('mother_cnic', e.target.value)} placeholder="XXXXX-XXXXXXX-X" />
                      <Input label="Mother's Mobile" value={form.mother_phone}
                        onChange={e => setField('mother_phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                      <Input label="Occupation" value={form.mother_occupation}
                        onChange={e => setField('mother_occupation', e.target.value)} />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Guardian (if different from parents)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Guardian Name" value={form.guardian_name}
                        onChange={e => setField('guardian_name', e.target.value)} />
                      <Input label="Relation to Student" value={form.guardian_relation}
                        onChange={e => setField('guardian_relation', e.target.value)} placeholder="Uncle, Grand parent..." />
                      <Input label="Guardian Mobile" value={form.guardian_phone}
                        onChange={e => setField('guardian_phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Academic Tab ─────────────────────────────────── */}
              {formTab === 'academic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Class" required value={form.school_class_id}
                      onChange={e => setField('school_class_id', e.target.value)}>
                      <option value="">Select class...</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </Select>
                    <Input label="Section" value={form.section} placeholder="A, B, C..."
                      onChange={e => setField('section', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Academic Year" value={form.academic_year_id}
                      onChange={e => setField('academic_year_id', e.target.value)}>
                      <option value="">Select year...</option>
                      {years.map(y => <option key={y._id} value={y._id}>{y.label}</option>)}
                    </Select>
                    <Select label="Medium of Instruction" value={form.medium}
                      onChange={e => setField('medium', e.target.value)}>
                      <option value="English">English</option>
                      <option value="Urdu">Urdu</option>
                    </Select>
                  </div>

                  {/* Subject Group */}
                  <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen size={15} className="text-sky-600"/>
                      <span className="text-xs font-bold text-sky-700 uppercase tracking-wide">Subject Group</span>
                      <span className="text-[10px] bg-sky-200 text-sky-700 px-2 py-0.5 rounded-full font-semibold">Grade 9–12</span>
                    </div>
                    <Select value={form.subject_group} onChange={e => setField('subject_group', e.target.value)}>
                      {SUBJECT_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </Select>
                    <p className="text-[10px] text-sky-600">Select "None" for Primary / Middle classes (Grade 1–8).</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Admission Date" type="date" value={form.admission_date}
                      onChange={e => setField('admission_date', e.target.value)} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Label>Siblings in This School</Label>
                        {confirmedSibIds.size > 0 && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {confirmedSibIds.size} auto-detected
                          </span>
                        )}
                      </div>
                      <input type="number" min="0" value={form.siblings_in_school}
                        onChange={e => setField('siblings_in_school', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"/>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Bus size={18} className="text-slate-500"/>
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input type="checkbox" checked={form.transport_required}
                        onChange={e => setField('transport_required', e.target.checked)}
                        className="w-4 h-4 rounded accent-sky-600"/>
                      <span className="text-sm font-medium text-slate-700">School transport required</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ── Address Tab ─────────────────────────────────── */}
              {formTab === 'address' && (
                <div className="space-y-4">
                  <Input label="Home Address" value={form.address}
                    onChange={e => setField('address', e.target.value)} placeholder="House No., Street, Area..." />
                  <Input label="City" value={form.city}
                    onChange={e => setField('city', e.target.value)} />

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <AlertCircle size={13}/> Emergency Contact
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Contact Name" value={form.emergency_contact_name}
                        onChange={e => setField('emergency_contact_name', e.target.value)} />
                      <Input label="Relation" value={form.emergency_contact_relation}
                        onChange={e => setField('emergency_contact_relation', e.target.value)} placeholder="Uncle, Aunt..." />
                      <Input label="Mobile Number" value={form.emergency_contact_phone}
                        onChange={e => setField('emergency_contact_phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Previous School Tab ─────────────────────────── */}
              {formTab === 'previous' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">Fill this section only if the student is transferring from another school.</p>
                  <Input label="Previous School Name" value={form.previous_school}
                    onChange={e => setField('previous_school', e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Last Class Attended" value={form.previous_class}
                      onChange={e => setField('previous_class', e.target.value)} placeholder="e.g. Grade 5" />
                    <Input label="School Leaving Certificate No." value={form.leaving_certificate_no}
                      onChange={e => setField('leaving_certificate_no', e.target.value)} />
                  </div>
                  <div>
                    <Label>Reason for Leaving</Label>
                    <textarea value={form.transfer_reason} rows={3}
                      onChange={e => setField('transfer_reason', e.target.value)}
                      placeholder="Migration, distance, facilities..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none bg-white"/>
                  </div>
                </div>
              )}

              {/* ── Medical Tab ─────────────────────────────────── */}
              {formTab === 'medical' && (
                <div className="space-y-4">
                  <div>
                    <Label>Any Physical Disability / Special Needs</Label>
                    <textarea value={form.disability} rows={3}
                      onChange={e => setField('disability', e.target.value)}
                      placeholder="Describe if any — visual, hearing, mobility, learning disability..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none bg-white"/>
                  </div>
                  <div>
                    <Label>Known Allergies / Medical Conditions</Label>
                    <textarea value={form.allergies} rows={3}
                      onChange={e => setField('allergies', e.target.value)}
                      placeholder="Food allergies, medications, chronic conditions..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none bg-white"/>
                  </div>
                </div>
              )}

              {/* ── Fees Tab ─────────────────────────────────────── */}
              {formTab === 'fees' && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700">First-Month Fee Invoice</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {form.school_class_id && form.academic_year_id
                          ? 'Select fees to apply. An invoice will be created on enrollment.'
                          : 'Please select a Class and Academic Year in the Academic tab first.'}
                      </p>
                    </div>
                    {form.school_class_id && form.academic_year_id && feeStructure === undefined && !feeLoading && (
                      <button onClick={() => fetchFeeStructure(form.school_class_id, form.academic_year_id)}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1.5 rounded-xl hover:bg-sky-100 transition-colors">
                        <RefreshCw size={12}/> Load Fee Structure
                      </button>
                    )}
                  </div>

                  {/* No class/year selected */}
                  {(!form.school_class_id || !form.academic_year_id) && (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Receipt size={36} className="text-slate-300 mx-auto mb-3"/>
                      <p className="text-slate-400 text-sm font-medium">No class or academic year selected</p>
                      <button onClick={() => setFormTab('academic')}
                        className="mt-2 text-xs font-bold text-sky-600 hover:underline">
                        Go to Academic tab →
                      </button>
                    </div>
                  )}

                  {/* Loading */}
                  {feeLoading && (
                    <div className="flex items-center justify-center py-10 gap-3 text-sky-600">
                      <div className="w-5 h-5 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin"/>
                      <span className="text-sm font-medium">Loading fee structure…</span>
                    </div>
                  )}

                  {/* No fee structure defined (null = loaded but nothing found) */}
                  {!feeLoading && form.school_class_id && form.academic_year_id && feeStructure === null && (
                    <div className="text-center py-10 bg-amber-50 rounded-2xl border border-dashed border-amber-200">
                      <Tag size={32} className="text-amber-400 mx-auto mb-3"/>
                      <p className="text-amber-700 text-sm font-semibold">No fee structure set for this class</p>
                      <p className="text-amber-500 text-xs mt-1">Set it up in <strong>Fee Structure</strong> page first.</p>
                    </div>
                  )}

                  {/* Fee items */}
                  {feeStructure?.items?.length > 0 && (() => {
                    const rawTotal  = feeStructure.items.reduce((s, it) => s + it.amount, 0);
                    const discount  = Number(feeDiscount) || 0;
                    const netTotal  = Math.max(0, rawTotal - discount);
                    const selTotal  = feeStructure.items
                      .filter(it => selectedFees[it._id])
                      .reduce((s, it) => s + it.amount, 0);
                    const selNet    = Math.max(0, selTotal - discount);
                    const paidNow   = Math.min(Number(feePaid) || 0, selNet);
                    const balance   = selNet - paidNow;

                    return (
                      <div className="space-y-4">
                        {/* Fee items checklist */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fee Heads</span>
                            <button onClick={() => {
                              const allSel = feeStructure.items.every(it => selectedFees[it._id]);
                              const next = {};
                              feeStructure.items.forEach(it => { next[it._id] = !allSel; });
                              setSelectedFees(next);
                            }} className="text-[10px] font-bold text-sky-600 hover:text-sky-800">
                              {feeStructure.items.every(it => selectedFees[it._id]) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          {feeStructure.items.map((item, i) => (
                            <label key={item._id}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${i < feeStructure.items.length - 1 ? 'border-b border-slate-100' : ''} ${selectedFees[item._id] ? 'bg-sky-50' : 'hover:bg-slate-50'}`}>
                              <div onClick={() => setSelectedFees(p => ({ ...p, [item._id]: !p[item._id] }))}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedFees[item._id] ? 'bg-sky-600 border-sky-600' : 'border-slate-300'}`}>
                                {selectedFees[item._id] && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm font-semibold ${selectedFees[item._id] ? 'text-slate-800' : 'text-slate-500'}`}>
                                  {item.fee_head_name}
                                </span>
                              </div>
                              <span className={`text-sm font-bold tabular-nums ${selectedFees[item._id] ? 'text-sky-700' : 'text-slate-400 line-through'}`}>
                                Rs. {item.amount.toLocaleString()}
                              </span>
                            </label>
                          ))}
                        </div>

                        {/* Discount + Due day info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Discount (Rs.)</Label>
                            <div className="relative">
                              <BadgePercent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                              <input type="number" min="0" value={feeDiscount}
                                onChange={e => setFeeDiscount(e.target.value)}
                                placeholder="0"
                                className="w-full pl-8 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"/>
                            </div>
                          </div>
                          <div>
                            <Label>Payment Method</Label>
                            <select value={feePayMethod} onChange={e => setFeePayMethod(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
                              {['cash','bank_transfer','cheque','online'].map(m => (
                                <option key={m} value={m}>{m.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Amount paid now */}
                        <div>
                          <Label>Amount Paid Now (Rs.) — leave 0 for unpaid</Label>
                          <input type="number" min="0" max={selNet} value={feePaid}
                            onChange={e => setFeePaid(e.target.value)}
                            placeholder="0"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"/>
                        </div>

                        {/* Notes */}
                        <div>
                          <Label>Notes (optional)</Label>
                          <input value={feeNotes} onChange={e => setFeeNotes(e.target.value)}
                            placeholder="Scholarship, sibling discount, etc."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"/>
                        </div>

                        {/* Summary box */}
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-2">
                          <p className="text-xs font-bold text-sky-700 uppercase tracking-widest mb-3">Invoice Summary</p>
                          {feeStructure.items.filter(it => selectedFees[it._id]).map(it => (
                            <div key={it._id} className="flex justify-between text-sm text-slate-700">
                              <span>{it.fee_head_name}</span>
                              <span className="font-semibold tabular-nums">Rs. {it.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          {discount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-700 border-t border-sky-200 pt-2 mt-1">
                              <span>Discount</span>
                              <span className="font-semibold tabular-nums">− Rs. {discount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-sky-900 border-t border-sky-200 pt-2 mt-1 text-base">
                            <span>Total Due</span>
                            <span className="tabular-nums">Rs. {selNet.toLocaleString()}</span>
                          </div>
                          {paidNow > 0 && (
                            <div className="flex justify-between text-sm text-emerald-700">
                              <span>Paid Now</span>
                              <span className="font-semibold tabular-nums">Rs. {paidNow.toLocaleString()}</span>
                            </div>
                          )}
                          <div className={`flex justify-between font-bold text-base pt-1 ${balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            <span>Balance</span>
                            <span className="tabular-nums">Rs. {balance.toLocaleString()}</span>
                          </div>
                          {balance === 0 && selNet > 0 && (
                            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mt-1">
                              <CheckCircle2 size={13}/> Fully Paid
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0">
              <div className="flex gap-2">
                {TABS.indexOf(TABS.find(t => t.id === formTab)) > 0 && (
                  <button onClick={() => setFormTab(TABS[TABS.indexOf(TABS.find(t => t.id === formTab)) - 1].id)}
                    className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                    <ChevronLeft size={15}/> Prev
                  </button>
                )}
                {TABS.indexOf(TABS.find(t => t.id === formTab)) < TABS.length - 1 && (
                  <button onClick={() => setFormTab(TABS[TABS.indexOf(TABS.find(t => t.id === formTab)) + 1].id)}
                    className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                    Next <ChevronRight size={15}/>
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-5 py-2 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/> : <CheckCircle2 size={15}/>}
                  {editId ? 'Save Changes' : 'Enroll Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials Modal ───────────────────────────────────────────── */}
      {credentials && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-green-600"/>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Student Enrolled!</h3>
              <p className="text-slate-500 text-sm mt-1">Portal login credentials generated</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Roll Number</p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{credentials.roll_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Login Email</p>
                <p className="font-mono text-sm text-slate-700 mt-0.5 break-all">{credentials.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Password</p>
                <p className="font-mono font-bold text-slate-800 mt-0.5 tracking-widest">{credentials.password}</p>
              </div>
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 text-center">
              Save this password now — it will not be shown again.
            </p>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => {
                  navigator.clipboard.writeText(`Roll No: ${credentials.roll_number}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`);
                  toast.success('Copied to clipboard');
                }}
                className="flex-1 border border-slate-200 py-2.5 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 flex items-center justify-center gap-2">
                <Copy size={14}/> Copy
              </button>
              {printSlip && (
                <button onClick={() => { setCredentials(null); }}
                  className="flex-1 border border-sky-200 bg-sky-50 text-sky-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-sky-100 flex items-center justify-center gap-2">
                  <Printer size={14}/> View & Print Slip
                </button>
              )}
              <button onClick={() => { setCredentials(null); setPrintSlip(null); }}
                className="flex-1 bg-sky-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-sky-700">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Admission Slip Modal ──────────────────────────────────── */}
      {printSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-sky-600"/>
                <h3 className="font-bold text-slate-800">Admission Slip</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors">
                  <Printer size={15}/> Print
                </button>
                <button onClick={() => setPrintSlip(null)} className="text-slate-400 hover:text-slate-700 ml-1">
                  <X size={20}/>
                </button>
              </div>
            </div>

            {/* Slip content — this is what gets printed */}
            <div ref={printRef} id="admission-slip" className="flex-1 overflow-y-auto p-6">
              <style>{`
                @media print {
                  body * { visibility: hidden !important; }
                  #admission-slip, #admission-slip * { visibility: visible !important; }
                  #admission-slip { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; }
                }
              `}</style>

              {/* School header */}
              <div className="flex items-center gap-4 border-b-2 border-sky-600 pb-4 mb-5">
                <img src={localLogo} alt="logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"/>
                <div className="flex-1">
                  <h1 className="text-xl font-extrabold text-slate-800 leading-tight">The Best Way Public School</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Excellence in Education</p>
                  <p className="text-xs text-slate-400">{printSlip.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admission Slip</p>
                  <p className="font-mono font-bold text-sky-700 text-sm mt-0.5">{printSlip.student?.roll_number}</p>
                  <span className="inline-block mt-1 bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">NEW ENROLLMENT</span>
                </div>
              </div>

              {/* Two column layout */}
              <div className="grid grid-cols-2 gap-6 mb-5">
                {/* Student info */}
                <div>
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-2">Student Information</p>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['Full Name',    printSlip.student?.full_name],
                        ['Roll Number',  printSlip.student?.roll_number],
                        ['Class',        printSlip.className],
                        ['Session',      printSlip.yearLabel],
                        ['Gender',       printSlip.student?.gender === 'female' ? 'Female' : 'Male'],
                        ['Date of Birth',printSlip.student?.dob ? new Date(printSlip.student.dob).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'}) : '—'],
                      ].map(([l,v]) => (
                        <tr key={l}>
                          <td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap w-28">{l}</td>
                          <td className="py-1.5 font-bold text-slate-800">{v || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Father/contact info */}
                <div>
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-2">Parent / Guardian</p>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ["Father's Name",  printSlip.student?.father_name],
                        ["Father's Mobile", printSlip.student?.father_phone],
                        ["Mother's Name",  printSlip.student?.mother_name],
                        ["Address",        printSlip.student?.address],
                        ["City",           printSlip.student?.city],
                      ].map(([l,v]) => (
                        <tr key={l}>
                          <td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap w-28">{l}</td>
                          <td className="py-1.5 font-bold text-slate-800">{v || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fee breakdown */}
              {printSlip.feeItems?.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-2">Fee Invoice</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] tracking-wider">
                          <th className="text-left px-3 py-2 font-bold">#</th>
                          <th className="text-left px-3 py-2 font-bold">Fee Head</th>
                          <th className="text-right px-3 py-2 font-bold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {printSlip.feeItems.map((it, i) => (
                          <tr key={it._id || i}>
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 font-semibold text-slate-700">{it.fee_head_name}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">Rs. {it.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        {printSlip.discount > 0 && (
                          <tr>
                            <td colSpan="2" className="px-3 py-1.5 text-right text-slate-600 font-semibold text-xs">Discount</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-emerald-700 tabular-nums">− Rs. {printSlip.discount.toLocaleString()}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan="2" className="px-3 py-2 text-right font-bold text-slate-800">Total Due</td>
                          <td className="px-3 py-2 text-right font-extrabold text-sky-700 tabular-nums">Rs. {printSlip.totalAmount.toLocaleString()}</td>
                        </tr>
                        {printSlip.paidNow > 0 && (
                          <tr>
                            <td colSpan="2" className="px-3 py-1.5 text-right font-semibold text-emerald-700">Paid ({printSlip.payMethod.replace('_',' ')})</td>
                            <td className="px-3 py-1.5 text-right font-bold text-emerald-700 tabular-nums">Rs. {printSlip.paidNow.toLocaleString()}</td>
                          </tr>
                        )}
                        <tr className="border-t-2 border-slate-300">
                          <td colSpan="2" className="px-3 py-2 text-right font-bold text-slate-800">Balance</td>
                          <td className={`px-3 py-2 text-right font-extrabold tabular-nums ${(printSlip.totalAmount - printSlip.paidNow) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            Rs. {Math.max(0, printSlip.totalAmount - printSlip.paidNow).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {printSlip.notes && (
                    <p className="text-xs text-slate-500 mt-2 italic">Note: {printSlip.notes}</p>
                  )}
                </div>
              )}

              {/* Portal credentials */}
              {printSlip.credentials && (
                <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Student Portal Login Credentials</p>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold">Roll Number</p>
                      <p className="font-mono font-bold text-slate-800 mt-0.5">{printSlip.credentials.roll_number}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Email / Login ID</p>
                      <p className="font-mono text-slate-700 mt-0.5 break-all">{printSlip.credentials.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">Password</p>
                      <p className="font-mono font-bold text-slate-800 mt-0.5 tracking-widest">{printSlip.credentials.password}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-2 font-semibold">⚠ Keep this confidential — password will not be shown again.</p>
                </div>
              )}

              {/* Signature lines */}
              <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-slate-200">
                {['Prepared By', "Parent's Signature", 'Principal'].map(label => (
                  <div key={label} className="text-center">
                    <div className="border-b border-slate-400 mb-2 h-8"/>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>

              <p className="text-center text-[9px] text-slate-300 mt-6">
                The Best Way Public School · {printSlip.date} · Computer-generated slip
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Student Profile Modal ───────────────────────────────────────── */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Profile Header */}
            <div className="relative bg-gradient-to-r from-sky-600 to-sky-700 rounded-t-2xl p-6 text-white">
              <button onClick={() => setShowProfile(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white">
                <X size={20}/>
              </button>
              <div className="flex items-center gap-4">
                {photoUrl(showProfile) ? (
                  <img src={photoUrl(showProfile)} alt={showProfile.full_name}
                    className="w-20 h-24 rounded-xl object-cover border-2 border-white/30 flex-shrink-0" />
                ) : (
                  <div className="w-20 h-24 rounded-xl bg-white/20 flex items-center justify-center text-3xl font-bold flex-shrink-0">
                    {showProfile.full_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{showProfile.full_name}</h2>
                  {showProfile.full_name_urdu && <p className="text-sky-200 text-sm" dir="rtl">{showProfile.full_name_urdu}</p>}
                  <p className="text-sky-200 font-mono text-sm mt-1">{showProfile.roll_number}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {showProfile.school_class_id?.name && (
                      <span className="bg-white/20 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {showProfile.school_class_id.name} {showProfile.section && `— ${showProfile.section}`}
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${showProfile.gender === 'female' ? 'bg-pink-400/30' : 'bg-blue-400/30'}`}>
                      {showProfile.gender === 'female' ? 'Female' : 'Male'}
                    </span>
                    <span className="bg-white/20 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {showProfile.blood_group}
                    </span>
                    {showProfile.subject_group && showProfile.subject_group !== 'None' && (
                      <span className="bg-amber-400/30 text-amber-100 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {showProfile.subject_group}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-6 space-y-5">
              {/* Personal */}
              <Section title="Personal Information">
                <Row label="Date of Birth" value={showProfile.dob ? new Date(showProfile.dob).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric'}) : '—'} />
                <Row label="Place of Birth" value={showProfile.place_of_birth} />
                <Row label="Religion" value={showProfile.religion} />
                <Row label="Nationality" value={showProfile.nationality} />
                <Row label="Domicile" value={showProfile.domicile} />
                <Row label="B-Form No." value={showProfile.b_form_no} />
              </Section>

              {/* Family */}
              <Section title="Family Information">
                <Row label="Father's Name" value={showProfile.father_name} />
                <Row label="Father's CNIC" value={showProfile.father_cnic} />
                <Row label="Father's Phone" value={showProfile.father_phone} />
                <Row label="Father's Occupation" value={`${showProfile.father_occupation || '—'} ${showProfile.father_employer ? `(${showProfile.father_employer})` : ''}`} />
                <Row label="Mother's Name" value={showProfile.mother_name} />
                <Row label="Mother's Phone" value={showProfile.mother_phone} />
              </Section>

              {/* Academic */}
              <Section title="Academic Details">
                <Row label="Class" value={`${showProfile.school_class_id?.name || '—'} ${showProfile.section ? `(Section ${showProfile.section})` : ''}`} />
                <Row label="Academic Year" value={showProfile.academic_year_id?.label} />
                <Row label="Medium" value={showProfile.medium} />
                {showProfile.subject_group && showProfile.subject_group !== 'None' && (
                  <Row label="Subject Group" value={showProfile.subject_group} />
                )}
                <Row label="Admission Date" value={showProfile.admission_date ? new Date(showProfile.admission_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric'}) : '—'} />
                <Row label="Transport" value={showProfile.transport_required ? 'Required' : 'Not Required'} />
              </Section>

              {/* Address */}
              {(showProfile.address || showProfile.city) && (
                <Section title="Address">
                  <Row label="Home Address" value={showProfile.address} />
                  <Row label="City" value={showProfile.city} />
                </Section>
              )}

              {/* Emergency */}
              {showProfile.emergency_contact_name && (
                <Section title="Emergency Contact">
                  <Row label="Name" value={showProfile.emergency_contact_name} />
                  <Row label="Phone" value={showProfile.emergency_contact_phone} />
                  <Row label="Relation" value={showProfile.emergency_contact_relation} />
                </Section>
              )}

              {/* Previous School */}
              {showProfile.previous_school && (
                <Section title="Previous School">
                  <Row label="School" value={showProfile.previous_school} />
                  <Row label="Last Class" value={showProfile.previous_class} />
                  <Row label="Leaving Cert No." value={showProfile.leaving_certificate_no} />
                </Section>
              )}

              {/* Medical */}
              {(showProfile.disability || showProfile.allergies) && (
                <Section title="Medical / Special Needs">
                  {showProfile.disability && <Row label="Disability" value={showProfile.disability} />}
                  {showProfile.allergies && <Row label="Allergies" value={showProfile.allergies} />}
                </Section>
              )}
            </div>

            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { setShowProfile(null); openEdit(showProfile); }}
                className="flex-1 border border-slate-200 py-2.5 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 flex items-center justify-center gap-2">
                <Edit2 size={14}/> Edit Record
              </button>
              <button onClick={() => setShowProfile(null)}
                className="flex-1 bg-sky-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-sky-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex justify-between px-4 py-2.5 text-sm">
      <span className="text-slate-500 flex-shrink-0 mr-4">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );
}
