import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { UserCircle, School } from 'lucide-react';

export default function ParentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/parent-portal/profile')
      .then(r => setProfile(r.data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>;
  if (!profile) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6"><UserCircle size={24} className="text-teal-600" /> My Profile</h1>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl">
            {profile.name?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-xl">{profile.name}</p>
            <p className="text-slate-500">{profile.email}</p>
            <span className="mt-1 inline-block text-xs bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full capitalize">{profile.role}</span>
          </div>
        </div>
      </div>

      {profile.student_ids?.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><School size={18} className="text-teal-600" /> My Children</h2>
          <div className="space-y-3">
            {profile.student_ids.map(s => (
              <div key={s._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg">
                  {s.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{s.full_name}</p>
                  <p className="text-sm text-slate-500">Roll: {s.roll_number}</p>
                  {s.school_class_id && (
                    <p className="text-xs text-teal-600 font-semibold mt-0.5">{s.school_class_id.name} — Section {s.school_class_id.section}</p>
                  )}
                </div>
                <div className="ml-auto">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
