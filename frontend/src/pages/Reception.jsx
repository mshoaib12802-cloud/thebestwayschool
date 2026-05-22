import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, Search, Plus, Calendar,
  Phone, MessageCircle, Clock, CheckCircle2,
  AlertCircle, Flame, X, ArrowRight, LayoutGrid, GraduationCap
} from 'lucide-react';

const Inquiries = () => {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'client'
  const [showModal, setShowModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form State
  const initialForm = {
    name: '', phone: '', email: '', visitor_type: 'student',
    interest: '', source: 'Social Media', budget: '', company_name: '',
    status: 'new', priority: 'medium', follow_up_date: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => { fetchVisitors(); }, []);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/visitors');
      setVisitors(data);
    } catch (error) { toast.error('Failed to load inquiries'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedVisitor) {
         await api.put(`/visitors/${selectedVisitor._id}`, formData);
         toast.success('Updated Successfully');
      } else {
         await api.post('/visitors/add', { ...formData, visitor_type: activeTab });
         toast.success('Lead Created! 🚀');
      }
      setShowModal(false);
      setSelectedVisitor(null);
      setFormData(initialForm);
      fetchVisitors();
    } catch (error) { toast.error('Failed'); }
  };

  // Helper Filters
  const filteredList = visitors.filter(v => 
    v.visitor_type === activeTab &&
    (statusFilter === 'all' || v.status === statusFilter) &&
    (v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search))
  );

  const handleConvertToStudent = (visitor) => {
    const params = new URLSearchParams({
      name: visitor.name || '',
      phone: visitor.phone || '',
      course: visitor.interest || '',
      visitor_id: visitor._id || ''
    });
    navigate(`/admissions?${params.toString()}`);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'new': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'contacted': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'meeting': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'converted': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'lost': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      
      {/* ================= 1. NEW FLOATING HEADER (Distinct Look) ================= */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-[2rem] shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-6 relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        {/* Left: Tab Switcher (Floating Pill) */}
        <div className="relative z-10 bg-slate-700/50 backdrop-blur-md p-1.5 rounded-2xl flex border border-slate-600">
           <button 
             onClick={() => setActiveTab('student')}
             className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${activeTab === 'student' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-300 hover:text-white'}`}
           >
             <Users size={18}/> Students
           </button>
           <button 
             onClick={() => setActiveTab('client')}
             className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${activeTab === 'client' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-300 hover:text-white'}`}
           >
             <Briefcase size={18}/> Clients
           </button>
        </div>

        {/* Right: Actions */}
        <div className="relative z-10 flex gap-4 w-full lg:w-auto">
           <div className="relative w-full lg:w-64">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18}/>
              <input 
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Search..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
           <button 
             onClick={() => { setSelectedVisitor(null); setFormData(initialForm); setShowModal(true); }}
             className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
           >
             <Plus size={20}/> Add Lead
           </button>
        </div>
      </div>

      {/* ================= 2. PIPELINE FILTERS ================= */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
         {['all', 'new', 'contacted', 'meeting', 'converted', 'lost'].map(status => (
            <button 
               key={status}
               onClick={() => setStatusFilter(status)}
               className={`px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all whitespace-nowrap border
                  ${statusFilter === status 
                     ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                     : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:bg-slate-50'}
               `}
            >
               {status}
            </button>
         ))}
      </div>

      {/* ================= 3. TICKET STYLE CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {filteredList.map(v => (
            <div key={v._id} className={`bg-white rounded-[2rem] p-0 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group relative border ${v.priority === 'high' ? 'border-rose-200 ring-2 ring-rose-50' : 'border-slate-100'}`}>
               
               {/* Header Section */}
               <div className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-2">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusColor(v.status)}`}>
                        {v.status}
                     </span>
                     {v.priority === 'high' && <Flame size={20} className="text-rose-500 animate-pulse"/>}
                  </div>
                  <h3 className="font-bold text-xl text-slate-800 line-clamp-1">{v.name}</h3>
                  <p className="text-sm font-medium text-slate-400">{v.visitor_type === 'client' ? v.company_name || 'Business Client' : 'Student Applicant'}</p>
               </div>

               {/* Divider Line */}
               <div className="h-px bg-slate-100 mx-6"></div>

               {/* Body Section */}
               <div className="p-6 pt-4 space-y-4">
                  
                  {/* Info Blocks */}
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-slate-50 p-3 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Interest</p>
                        <p className="font-bold text-slate-700 text-sm truncate">{v.interest}</p>
                     </div>
                     <div className={`p-3 rounded-2xl ${v.follow_up_date && new Date(v.follow_up_date) <= new Date() ? 'bg-rose-50' : 'bg-slate-50'}`}>
                        <p className={`text-[10px] font-bold uppercase mb-1 ${v.follow_up_date && new Date(v.follow_up_date) <= new Date() ? 'text-rose-400' : 'text-slate-400'}`}>Follow Up</p>
                        <div className="flex items-center gap-1 font-bold text-slate-700 text-sm">
                           <Clock size={14}/> {v.follow_up_date ? new Date(v.follow_up_date).toLocaleDateString() : '-'}
                        </div>
                     </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                     <a href={`https://wa.me/${v.phone}`} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all">
                        <MessageCircle size={18}/> WhatsApp
                     </a>
                     <a href={`tel:${v.phone}`} className="w-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
                        <Phone size={18}/>
                     </a>
                     {v.visitor_type === 'student' && v.status !== 'converted' && v.status !== 'lost' && (
                       <button
                         onClick={() => handleConvertToStudent(v)}
                         title="Enroll as Student"
                         className="w-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors"
                       >
                         <GraduationCap size={18}/>
                       </button>
                     )}
                     <button onClick={() => { setSelectedVisitor(v); setFormData(v); setShowModal(true); }} className="w-12 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-slate-700 transition-colors">
                        <ArrowRight size={18}/>
                     </button>
                  </div>
               </div>
            </div>
         ))}
      </div>
      
      {filteredList.length === 0 && !loading && (
         <div className="text-center py-20">
            <LayoutGrid size={48} className="mx-auto mb-4 text-slate-300"/>
            <p className="text-slate-400 font-bold">No leads found.</p>
         </div>
      )}

      {/* ================= 4. FIXED MODAL (CENTERED & SCROLLABLE) ================= */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
           
           {/* Modal Container */}
           <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-fade-in-up relative">
              
              {/* Close Button (Always Visible) */}
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors z-50"
              >
                <X size={20}/>
              </button>

              {/* Header */}
              <div className="p-8 pb-4 border-b border-slate-100 shrink-0">
                 <h3 className="text-2xl font-extrabold text-slate-800">
                    {selectedVisitor ? 'Update Lead Details' : `Add New ${activeTab === 'student' ? 'Student' : 'Client'}`}
                 </h3>
                 <p className="text-slate-500 text-sm">Please fill all required information.</p>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto p-8 pt-4 custom-scrollbar">
                 <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Grid Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</label>
                          <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</label>
                          <input required className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="03xx-xxxxxxx" />
                       </div>
                    </div>

                    {activeTab === 'client' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</label>
                             <input className="form-input" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</label>
                             <input type="number" className="form-input" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
                          </div>
                       </div>
                    )}

                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeTab === 'student' ? 'Course Interest' : 'Project Need'}</label>
                       <input className="form-input" value={formData.interest} onChange={e => setFormData({...formData, interest: e.target.value})} />
                    </div>

                    {/* Pipeline Status Box */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                       <h4 className="font-bold text-slate-700 text-sm uppercase mb-4 flex items-center gap-2"><AlertCircle size={16}/> Status & Follow-up</h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Stage</label>
                             <select className="form-select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                <option value="new">New</option><option value="contacted">Contacted</option>
                                <option value="meeting">Meeting</option><option value="converted">Won</option><option value="lost">Lost</option>
                             </select>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Priority</label>
                             <select className="form-select" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                                <option value="medium">Medium</option><option value="high">High 🔥</option><option value="low">Low</option>
                             </select>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Next Date</label>
                             <input type="date" className="form-input" value={formData.follow_up_date ? formData.follow_up_date.split('T')[0] : ''} onChange={e => setFormData({...formData, follow_up_date: e.target.value})} />
                          </div>
                       </div>
                    </div>

                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-slate-800 transition-all">
                       {selectedVisitor ? 'Update Lead' : 'Create Lead'}
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Inquiries;