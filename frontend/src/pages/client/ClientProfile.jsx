import { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserCircle, Building2, Phone, Mail, MapPin, Globe, Tag } from 'lucide-react';

export default function ClientProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/client-portal/profile')
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!profile) return (
    <div className="text-center py-16 text-slate-400">Failed to load profile.</div>
  );

  const fields = [
    { icon: Building2, label: 'Company',        value: profile.company_name },
    { icon: UserCircle, label: 'Contact Person', value: profile.contact_person },
    { icon: Mail,       label: 'Email',          value: profile.email },
    { icon: Phone,      label: 'Phone',          value: profile.phone },
    { icon: MapPin,     label: 'City',           value: profile.city },
    { icon: MapPin,     label: 'Address',        value: profile.address },
    { icon: Globe,      label: 'Website',        value: profile.website },
    { icon: Tag,        label: 'Industry',       value: profile.industry },
  ].filter(f => f.value);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <UserCircle size={24} className="text-amber-500"/> My Profile
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">Your account and company information</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0">
          {(profile.company_name || profile.contact_person || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-extrabold text-slate-800">{profile.company_name}</p>
          {profile.contact_person && <p className="text-sm text-slate-500">{profile.contact_person}</p>}
          <span className={`mt-1 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
            profile.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
            profile.status === 'prospect' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {profile.status}
          </span>
        </div>
      </div>

      {/* Info fields */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
        {fields.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-amber-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-xs text-amber-700 font-bold">Need to update your information?</p>
        <p className="text-xs text-amber-600 mt-0.5">Please contact our team via the Messages section and we'll update your profile for you.</p>
      </div>
    </div>
  );
}
