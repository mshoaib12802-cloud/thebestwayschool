import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { confirm } from '../utils/confirm';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Users, UserPlus, Briefcase, Search,
  Trash2, Phone, Mail, Calendar, X, ShieldCheck,
  Download, MapPin, Hash, User, FileText, KeyRound, Copy, CheckCheck,
  BookOpen, Plus, Tag
} from 'lucide-react';
import RupeeIcon from '../components/RupeeIcon';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [credentials, setCredentials] = useState(null); // { email, password }
  const [credLoading, setCredLoading] = useState(false);
  const [copied, setCopied] = useState('');

  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: 'teacher',
    salary_amount: '', commission_percent: '', joining_date: new Date().toISOString().split('T')[0],
    assigned_courses: []
  });

  const [trainerEarnings, setTrainerEarnings] = useState(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [courses, setCourses] = useState([]);
  const [editCourses, setEditCourses] = useState(null); // null | string[] when editing in profile
  const [savingCourses, setSavingCourses] = useState(false);

  useEffect(() => { fetchStaff(); fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data.filter(c => c.is_active));
    } catch { /* optional */ }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/staff');
      setStaff(data);
    } catch (error) { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/staff/add', formData);
      toast.success('Staff onboarded! Credentials sent to their Gmail.');
      setShowFormModal(false);
      fetchStaff();
      setFormData({ name: '', email: '', phone: '', role: 'teacher', salary_amount: '', commission_percent: '', joining_date: '', assigned_courses: [] });
      if (data.credentials) setCredentials(data.credentials);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to add'); }
  };

  const handleResetCredentials = async (member, e) => {
    if (e) e.stopPropagation();
    setCredLoading(true);
    try {
      const { data } = await api.post(`/staff/${member._id}/reset-credentials`);
      setCredentials(data.credentials);
      toast.success('New credentials sent to staff Gmail!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reset credentials'); }
    finally { setCredLoading(false); }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const toggleFormCourse = (courseName) => {
    setFormData(f => ({
      ...f,
      assigned_courses: f.assigned_courses.includes(courseName)
        ? f.assigned_courses.filter(c => c !== courseName)
        : [...f.assigned_courses, courseName]
    }));
  };

  const openProfileCourseEdit = () => {
    setEditCourses(selectedStaff.assigned_courses || []);
  };

  const toggleEditCourse = (courseName) => {
    setEditCourses(prev =>
      prev.includes(courseName) ? prev.filter(c => c !== courseName) : [...prev, courseName]
    );
  };

  const handleSaveCourses = async () => {
    setSavingCourses(true);
    try {
      const { data } = await api.put(`/staff/${selectedStaff._id}/courses`, { assigned_courses: editCourses });
      setSelectedStaff(data);
      setStaff(prev => prev.map(s => s._id === data._id ? data : s));
      setEditCourses(null);
      toast.success('Courses updated!');
    } catch { toast.error('Failed to save courses'); }
    finally { setSavingCourses(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Card click hone se rokein
    if(!await confirm("Are you sure? This cannot be undone.", { title: 'Delete Staff Member' })) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff Removed');
      fetchStaff();
    } catch (error) { toast.error('Delete Failed'); }
  };

  const openProfile = async (member) => {
    setSelectedStaff(member);
    setTrainerEarnings(null);
    setShowProfileModal(true);
    if (member.role === 'teacher') {
      setLoadingEarnings(true);
      try {
        const { data } = await api.get(`/finance/trainer/${member._id}/earnings`);
        setTrainerEarnings(data);
      } catch { /* earnings optional */ }
      finally { setLoadingEarnings(false); }
    }
  };

  const downloadSalarySlip = () => {
    const doc = new jsPDF();
    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('SALARY SLIP', 14, 18);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`The Best Way Public School  |  ${month}`, 14, 28);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Employee Details', 14, 52);
    autoTable(doc, {
      startY: 58,
      body: [
        ['Name', selectedStaff.name],
        ['Role', selectedStaff.role?.replace('_', ' ')],
        ['Email', selectedStaff.email || '—'],
        ['Phone', selectedStaff.phone || '—'],
        ['Joining Date', selectedStaff.joining_date ? new Date(selectedStaff.joining_date).toLocaleDateString() : '—'],
      ],
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });
    const y2 = doc.lastAutoTable.finalY + 10;
    doc.setFont(undefined, 'bold');
    doc.text('Salary Breakdown', 14, y2);
    autoTable(doc, {
      startY: y2 + 6,
      head: [['Description', 'Amount']],
      body: [
        ['Basic Salary', `Rs. ${(selectedStaff.salary_amount || 0).toLocaleString()}`],
        ...(selectedStaff.role === 'teacher' && trainerEarnings ? [['Commission Earned (this month)', `Rs. ${trainerEarnings.summary.total_earned.toLocaleString()}`]] : []),
        ['Net Payable', `Rs. ${((selectedStaff.salary_amount || 0) + (trainerEarnings?.summary?.total_earned || 0)).toLocaleString()}`],
      ],
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10 },
      columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
    });
    const y3 = doc.lastAutoTable.finalY + 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y3, 90, y3);
    doc.line(120, y3, 196, y3);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Employee Signature', 14, y3 + 7);
    doc.text('Authorized Signature', 120, y3 + 7);
    doc.save(`${selectedStaff.name}_SalarySlip_${month.replace(' ', '_')}.pdf`);
    toast.success('Salary Slip Downloaded!');
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-gen-staff');
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${selectedStaff.name}_Staff_QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const filteredStaff = staff.filter(member => {
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (member.phone || '').includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  const totalPayroll = staff.reduce((acc, curr) => acc + (curr.salary_amount || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      
      {/* --- HEADER & STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
             <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
               <Briefcase className="text-indigo-600" size={32}/> Human Resources
             </h2>
             <p className="text-slate-500 mt-1 ml-1 font-medium">Manage employees, payrolls & access.</p>
           </div>
           <button 
             onClick={() => setShowFormModal(true)} 
             className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-2"
           >
             <UserPlus size={20}/> Hire New Staff
           </button>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-200">
           <div className="flex items-center gap-3 opacity-90 mb-2">
             <Users size={20}/> <span className="uppercase text-xs font-bold tracking-wider">Total Staff</span>
           </div>
           <p className="text-4xl font-extrabold">{staff.length}</p>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-200">
           <div className="flex items-center gap-3 opacity-90 mb-2">
             <RupeeIcon size={20}/> <span className="uppercase text-xs font-bold tracking-wider">Monthly Payroll</span>
           </div>
           <p className="text-4xl font-extrabold">Rs. {totalPayroll.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
           <div className="flex items-center gap-3 text-slate-400 mb-3">
             <ShieldCheck size={20}/> <span className="uppercase text-xs font-bold tracking-wider">Departments</span>
           </div>
           <div className="flex gap-2 flex-wrap">
             <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100">Academic</span>
             <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold border border-purple-100">Admin</span>
             <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-100">Support</span>
           </div>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto custom-scrollbar w-full md:w-auto">
            {['all', 'teacher', 'clerk', 'office_boy'].map(role => (
              <button 
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${filterRole === role ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
         </div>

         <div className="relative w-full md:w-64">
           <Search className="absolute left-4 top-3 text-slate-400" size={18}/>
           <input 
             className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
             placeholder="Search by name..."
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
         </div>
      </div>

      {/* --- STAFF GRID (Clickable) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member) => (
          <div 
            key={member._id} 
            onClick={() => openProfile(member)}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden cursor-pointer"
          >
            <div className={`absolute top-0 left-0 w-full h-24 opacity-10 ${
              member.role === 'teacher' ? 'bg-indigo-500' : 
              member.role === 'admin' ? 'bg-purple-500' : 'bg-orange-500'
            }`}></div>

            <div className="relative flex justify-between items-start">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-2xl font-bold text-slate-700 border border-slate-100">
                {member.name.charAt(0)}
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                 member.role === 'teacher' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                 member.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-orange-50 text-orange-600 border-orange-100'
              }`}>
                {member.role.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4">
              <h3 className="text-xl font-extrabold text-slate-800">{member.name}</h3>
              <p className="text-slate-400 text-sm flex items-center gap-2 mt-1 font-medium">
                 <Mail size={14}/> {member.email}
              </p>
              {member.role === 'teacher' && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(member.assigned_courses || []).length > 0
                    ? member.assigned_courses.map(c => (
                        <span key={c} className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full">{c}</span>
                      ))
                    : <span className="text-[10px] text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">No course assigned</span>
                  }
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salary</p>
                 <p className="font-bold text-slate-700">Rs. {member.salary_amount?.toLocaleString()}</p>
               </div>
               {member.role === 'teacher' && member.commission_percent > 0 ? (
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commission</p>
                   <p className="font-bold text-amber-600">{member.commission_percent}% per fee</p>
                 </div>
               ) : (
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Joined</p>
                   <p className="font-bold text-slate-700">
                      {member.joining_date ? new Date(member.joining_date).toLocaleDateString() : '-'}
                   </p>
                 </div>
               )}
            </div>

            {/* Actions (Stop Propagation) */}
            <div className="mt-6 flex gap-2">
              <a
                href={`tel:${member.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-slate-50 text-slate-600 py-2.5 rounded-xl font-bold text-sm text-center hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone size={15}/> Call
              </a>
              <button
                onClick={(e) => handleResetCredentials(member, e)}
                title="Assign / Reset Login Credentials"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
              >
                <KeyRound size={15}/> Login
              </button>
              <button
                onClick={(e) => handleDelete(member._id, e)}
                className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={17}/>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* ================= PROFILE MODAL (WITH QR DOWNLOAD) ================= */}
      {showProfileModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in-up">
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
              
              {/* Left Side: Employee ID Card */}
              <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 w-full text-center relative z-10">
                    <div className={`w-24 h-24 mx-auto text-white rounded-full flex items-center justify-center text-4xl font-bold mb-4 shadow-lg ${
                       selectedStaff.role === 'teacher' ? 'bg-indigo-600' : 
                       selectedStaff.role === 'admin' ? 'bg-purple-600' : 'bg-orange-500'
                    }`}>
                       {selectedStaff.name.charAt(0)}
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-800">{selectedStaff.name}</h2>
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase mt-2 mb-4">
                       {selectedStaff.role.replace('_', ' ')}
                    </span>
                    
                    {/* QR Code Canvas */}
                    <div className="bg-white p-2 rounded-xl border-2 border-dashed border-slate-300 inline-block mb-4">
                       <QRCodeCanvas 
                          id="qr-gen-staff"
                          value={selectedStaff.qr_code || selectedStaff._id} 
                          size={120}
                          level={"H"}
                          includeMargin={true}
                       />
                    </div>
                    
                    <button
                       onClick={downloadQR}
                       className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-300 mb-2"
                    >
                       <Download size={16}/> Download ID QR
                    </button>
                    <button
                       onClick={downloadSalarySlip}
                       className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all mb-2"
                    >
                       <FileText size={16}/> Salary Slip PDF
                    </button>
                    <button
                       onClick={(e) => handleResetCredentials(selectedStaff, e)}
                       disabled={credLoading}
                       className="w-full py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-60"
                    >
                       <KeyRound size={16}/> {credLoading ? 'Generating...' : 'Assign Login Credentials'}
                    </button>
                 </div>
                 
                 {/* Decorative Blobs */}
                 <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mt-32"></div>
                 <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mb-32"></div>
              </div>

              {/* Right Side: Detailed Info */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                 <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
                    <X size={20}/>
                 </button>

                 <h3 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                    <User className="text-indigo-500"/> Employee Details
                 </h3>

                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                          <p className="font-bold text-slate-700 flex items-center gap-2">
                             <Mail size={14} className="text-slate-400"/> {selectedStaff.email}
                          </p>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                          <p className="font-bold text-slate-700 flex items-center gap-2">
                             <Phone size={14} className="text-slate-400"/> {selectedStaff.phone}
                          </p>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joining Date</label>
                          <p className="font-bold text-slate-700 flex items-center gap-2">
                             <Calendar size={14} className="text-slate-400"/> 
                             {selectedStaff.joining_date ? new Date(selectedStaff.joining_date).toLocaleDateString() : 'N/A'}
                          </p>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee ID / QR</label>
                          <p className="font-bold text-slate-700 flex items-center gap-2">
                             <Hash size={14} className="text-slate-400"/> {selectedStaff.qr_code || 'Auto-Generated'}
                          </p>
                       </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full my-4"></div>

                    {/* Payroll Info */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                       <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase">
                          <RupeeIcon size={16} className="text-emerald-500"/> Payroll Information
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                             <p className="text-xs text-slate-500 mb-1">Salary Type</p>
                             <p className="font-bold text-slate-800 text-lg capitalize">{selectedStaff.salary_type || 'Monthly'}</p>
                          </div>
                          <div>
                             <p className="text-xs text-slate-500 mb-1">Base Salary</p>
                             <p className="font-extrabold text-emerald-600 text-2xl">
                                Rs. {selectedStaff.salary_amount?.toLocaleString()}
                             </p>
                          </div>
                          {selectedStaff.role === 'teacher' && (
                            <div>
                               <p className="text-xs text-slate-500 mb-1">Commission Rate</p>
                               <p className="font-extrabold text-indigo-600 text-2xl">
                                  {selectedStaff.commission_percent || 0}%
                               </p>
                            </div>
                          )}
                       </div>
                    </div>

                    {/* Assigned Courses (teacher only) */}
                    {selectedStaff.role === 'teacher' && (
                      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-indigo-800 flex items-center gap-2 text-sm uppercase">
                            <BookOpen size={16} className="text-indigo-500"/> Assigned Courses
                          </h4>
                          {editCourses === null
                            ? <button onClick={openProfileCourseEdit}
                                className="text-xs font-bold text-indigo-600 bg-white border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
                                Edit
                              </button>
                            : <div className="flex gap-2">
                                <button onClick={handleSaveCourses} disabled={savingCourses}
                                  className="text-xs font-bold text-white bg-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60">
                                  {savingCourses ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={() => setEditCourses(null)}
                                  className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors">
                                  Cancel
                                </button>
                              </div>
                          }
                        </div>

                        {editCourses === null ? (
                          <div className="flex flex-wrap gap-2">
                            {(selectedStaff.assigned_courses || []).length > 0
                              ? selectedStaff.assigned_courses.map(c => (
                                  <span key={c} className="text-xs font-bold px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl">{c}</span>
                                ))
                              : <p className="text-sm text-amber-600 font-medium">No courses assigned yet. Click Edit to assign.</p>
                            }
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {courses.map(c => (
                              <button key={c._id} onClick={() => toggleEditCourse(c.name)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                                  editCourses.includes(c.name)
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                }`}>
                                {editCourses.includes(c.name) ? '✓ ' : ''}{c.name}
                              </button>
                            ))}
                            {courses.length === 0 && <p className="text-xs text-slate-400">No courses in catalog yet.</p>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Trainer Commission Earnings */}
                    {selectedStaff.role === 'teacher' && (
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                        <h4 className="font-bold text-amber-800 mb-4 flex items-center gap-2 text-sm uppercase">
                          <RupeeIcon size={16} className="text-amber-500"/> Commission Earnings
                        </h4>
                        {loadingEarnings ? (
                          <p className="text-slate-400 text-sm">Loading earnings...</p>
                        ) : trainerEarnings ? (
                          <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-amber-700 mb-1">Total Earned</p>
                                <p className="font-extrabold text-amber-700 text-2xl">
                                  Rs. {trainerEarnings.summary.total_earned.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-amber-700 mb-1">Transactions</p>
                                <p className="font-extrabold text-amber-700 text-2xl">
                                  {trainerEarnings.summary.transaction_count}
                                </p>
                              </div>
                            </div>
                            {trainerEarnings.history.length > 0 && (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {trainerEarnings.history.slice(0, 5).map(t => (
                                  <div key={t._id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-100 text-sm">
                                    <div>
                                      <p className="font-semibold text-slate-700">{t.student_id?.full_name || 'Student'}</p>
                                      <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className="font-extrabold text-emerald-600">+Rs. {t.amount}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-400 text-sm">No commission records yet.</p>
                        )}
                      </div>
                    )}

                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- CREDENTIALS MODAL --- */}
      {credentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <KeyRound size={20} className="text-emerald-600"/>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800">Login Credentials</h3>
                  <p className="text-xs text-slate-500">Share these with the staff member</p>
                </div>
              </div>
              <button onClick={() => setCredentials(null)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
                <X size={18}/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 font-medium">
                ✅ Credentials have been emailed to the staff member's Gmail. Also shown below for your records.
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Email (Login ID)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold text-slate-700 select-all">
                    {credentials.email}
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentials.email, 'email')}
                    className={`p-3 rounded-xl transition-all ${copied === 'email' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    {copied === 'email' ? <CheckCheck size={17}/> : <Copy size={17}/>}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Password</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-lg font-extrabold text-slate-800 tracking-widest select-all">
                    {credentials.password}
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentials.password, 'pass')}
                    className={`p-3 rounded-xl transition-all ${copied === 'pass' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    {copied === 'pass' ? <CheckCheck size={17}/> : <Copy size={17}/>}
                  </button>
                </div>
              </div>

              {/* Copy All + Done */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => copyToClipboard(`Email: ${credentials.email}\nPassword: ${credentials.password}`, 'all')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    copied === 'all' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {copied === 'all' ? <CheckCheck size={16}/> : <Copy size={16}/>}
                  {copied === 'all' ? 'Copied!' : 'Copy Both'}
                </button>
                <button
                  onClick={() => setCredentials(null)}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD STAFF MODAL --- */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                   <UserPlus className="text-indigo-600"/> Onboard New Staff
                 </h3>
                 <button onClick={() => setShowFormModal(false)} className="p-2 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
                   <X size={20}/>
                 </button>
              </div>
              
              <form onSubmit={handleAddStaff} className="p-8 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Full Name</label>
                      <input required className="form-input font-bold text-slate-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Sarah Ahmed" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Role</label>
                      <select className="form-select font-bold text-slate-700" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                        <option value="teacher">Teacher</option>
                        <option value="clerk">Account Clerk</option>
                        <option value="office_boy">Support Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Phone</label>
                      <input required className="form-input font-bold text-slate-700" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="0300-0000000" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Email</label>
                      <input required type="email" className="form-input font-bold text-slate-700" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="staff@school.com" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Base Salary</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 font-bold text-xs">Rs.</span>
                        <input required type="number" className="form-input pl-10 font-bold text-slate-700" value={formData.salary_amount} onChange={e => setFormData({...formData, salary_amount: e.target.value})} placeholder="50000" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Commission % (per fee collected)</label>
                      <div className="relative">
                        <input type="number" min="0" max="100" step="0.5" className="form-input font-bold text-slate-700" value={formData.commission_percent} onChange={e => setFormData({...formData, commission_percent: e.target.value})} placeholder="e.g. 10" />
                        <span className="absolute right-4 top-3 text-slate-400 font-bold text-xs">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Joining Date</label>
                      <input type="date" className="form-input font-bold text-slate-700" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} />
                    </div>
                 </div>

                 {/* Course assignment for teachers */}
                 {formData.role === 'teacher' && (
                   <div className="md:col-span-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-1">
                       <BookOpen size={11}/> Assign Courses (which courses this teacher will teach)
                     </label>
                     {courses.length === 0
                       ? <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200">No courses in catalog yet. Add courses first.</p>
                       : <div className="flex flex-wrap gap-2">
                           {courses.map(c => (
                             <button type="button" key={c._id} onClick={() => toggleFormCourse(c.name)}
                               className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
                                 formData.assigned_courses.includes(c.name)
                                   ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                   : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                               }`}>
                               {formData.assigned_courses.includes(c.name) ? '✓ ' : <Plus size={10} className="inline mr-0.5"/>}{c.name}
                             </button>
                           ))}
                         </div>
                     }
                     {formData.assigned_courses.length > 0 && (
                       <p className="text-xs text-indigo-600 font-medium mt-2">
                         Selected: {formData.assigned_courses.join(', ')}
                       </p>
                     )}
                   </div>
                 )}

                 <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                   <UserPlus size={20}/> Create Employee Profile
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default Staff;