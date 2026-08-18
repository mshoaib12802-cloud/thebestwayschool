import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { Truck, Users, MapPin, Phone, Clock, BanknoteIcon } from 'lucide-react';

export default function ParentTransport() {
  const [children, setChildren]     = useState([]);
  const [selected, setSelected]     = useState('');
  const [transport, setTransport]   = useState(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingTransport, setLoadingTransport] = useState(false);

  useEffect(() => {
    api.get('/parent-portal/children')
      .then(r => { setChildren(r.data); if (r.data.length) setSelected(r.data[0]._id); })
      .catch(() => toast.error('Failed to load children'))
      .finally(() => setLoadingChildren(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingTransport(true);
    setTransport(null);
    api.get(`/parent-portal/children/${selected}/transport`)
      .then(r => setTransport(r.data))
      .catch(err => {
        if (err.response?.status === 404) {
          setTransport(null);
        } else {
          toast.error('Failed to load transport info');
        }
      })
      .finally(() => setLoadingTransport(false));
  }, [selected]);

  if (loadingChildren) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (!children.length) return (
    <div className="text-center py-16 text-slate-400">
      <Users size={48} className="mx-auto mb-3 opacity-30" />
      <p>No children linked to your account.</p>
    </div>
  );

  const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Truck size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transport</h1>
          <p className="text-slate-500 text-sm">Your child's bus and route information</p>
        </div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {children.map(c => (
            <button key={c._id} onClick={() => setSelected(c._id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border transition-all ${selected === c._id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loadingTransport ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : !transport ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <Truck size={56} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-1">No Transport Assigned</h3>
          <p className="text-sm">
            {children.find(c => c._id === selected)?.name || 'This child'} has no transport assignment.
            Please contact the school admin if you require transport.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Route & Vehicle */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Route & Vehicle</h2>
            <InfoRow icon={<MapPin size={15} className="text-blue-500" />} label="Route Name" value={transport.route_id?.name || transport.route_name} />
            <InfoRow icon={<Truck size={15} className="text-blue-500" />} label="Vehicle Registration" value={transport.vehicle_id?.registration_no || transport.vehicle_registration} />
            {(transport.vehicle_id?.model || transport.vehicle_model) && (
              <InfoRow icon={<Truck size={15} className="text-blue-500" />} label="Vehicle Model" value={transport.vehicle_id?.model || transport.vehicle_model} />
            )}
          </div>

          {/* Driver */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Driver</h2>
            <InfoRow icon={<Users size={15} className="text-blue-500" />} label="Driver Name" value={transport.driver_name || transport.driver_id?.name} />
            <InfoRow icon={<Phone size={15} className="text-blue-500" />} label="Driver Phone" value={transport.driver_phone || transport.driver_id?.phone} />
          </div>

          {/* Stop & Timing */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Stop & Timing</h2>
            <InfoRow icon={<MapPin size={15} className="text-blue-500" />} label="Stop Name" value={transport.stop_name || transport.stop_id?.name} />
            <InfoRow icon={<Clock size={15} className="text-blue-500" />} label="Pickup Time" value={transport.pickup_time} />
            <InfoRow icon={<Clock size={15} className="text-blue-500" />} label="Drop Time" value={transport.drop_time} />
          </div>

          {/* Fee */}
          {transport.monthly_fee != null && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl shadow-sm p-5">
              <h2 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Fee</h2>
              <InfoRow icon={<BanknoteIcon size={15} className="text-blue-500" />} label="Monthly Transport Fee" value={`Rs. ${Number(transport.monthly_fee).toLocaleString()}`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
