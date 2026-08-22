import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  Truck, Plus, Edit2, Trash2, X, Search, MapPin,
  User, Phone, Clock, RefreshCw
} from 'lucide-react';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:bg-white transition-colors';
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1';

const initVehicle = { reg_no: '', type: 'bus', capacity: '', driver_name: '', driver_phone: '', conductor_name: '', conductor_phone: '' };
const initRoute = { name: '', vehicle_id: '', stops: [] };
const initEnrollForm = { student_id: '', route_id: '', stop_name: '' };

export default function Transport() {
  const [activeTab, setActiveTab] = useState('vehicles');

  // Vehicles
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(initVehicle);
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Routes
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editRouteId, setEditRouteId] = useState(null);
  const [routeForm, setRouteForm] = useState(initRoute);
  const [savingRoute, setSavingRoute] = useState(false);
  const [newStop, setNewStop] = useState({ name: '', pickup_time: '', drop_time: '', monthly_fee: '' });

  // Students
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [filterRoute, setFilterRoute] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState(initEnrollForm);
  const [enrolling, setEnrolling] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => { fetchVehicles(); fetchRoutes(); fetchStudents(); }, []);
  useEffect(() => { fetchEnrollments(); }, [filterRoute]);
  useEffect(() => {
    document.body.style.overflow = (showVehicleModal || showRouteModal || showEnrollModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showVehicleModal, showRouteModal, showEnrollModal]);

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try { const { data } = await api.get('/transport/vehicles'); setVehicles(data); }
    catch { toast.error('Failed to load vehicles'); }
    finally { setLoadingVehicles(false); }
  };
  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    try { const { data } = await api.get('/transport/routes'); setRoutes(data); }
    catch { toast.error('Failed to load routes'); }
    finally { setLoadingRoutes(false); }
  };
  const fetchEnrollments = async () => {
    setLoadingEnrollments(true);
    try {
      const params = filterRoute ? { route_id: filterRoute } : {};
      const { data } = await api.get('/transport/students', { params });
      setEnrollments(data);
    } catch { toast.error('Failed to load enrollments'); }
    finally { setLoadingEnrollments(false); }
  };
  const fetchStudents = async () => {
    try { const { data } = await api.get('/students'); setStudents(data); } catch { /* optional */ }
  };

  // Vehicle CRUD
  const openAddVehicle = () => { setEditVehicleId(null); setVehicleForm(initVehicle); setShowVehicleModal(true); };
  const openEditVehicle = (v) => { setEditVehicleId(v._id); setVehicleForm({ reg_no: v.reg_no, type: v.type || 'bus', capacity: v.capacity || '', driver_name: v.driver_name || '', driver_phone: v.driver_phone || '', conductor_name: v.conductor_name || '', conductor_phone: v.conductor_phone || '' }); setShowVehicleModal(true); };
  const saveVehicle = async (e) => {
    e.preventDefault(); setSavingVehicle(true);
    try {
      if (editVehicleId) { await api.put(`/transport/vehicles/${editVehicleId}`, vehicleForm); toast.success('Vehicle updated'); }
      else { await api.post('/transport/vehicles', vehicleForm); toast.success('Vehicle added'); }
      setShowVehicleModal(false); fetchVehicles();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSavingVehicle(false); }
  };
  const deleteVehicle = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try { await api.delete(`/transport/vehicles/${id}`); toast.success('Deleted'); fetchVehicles(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  // Route CRUD
  const openAddRoute = () => { setEditRouteId(null); setRouteForm(initRoute); setNewStop({ name: '', pickup_time: '', drop_time: '', monthly_fee: '' }); setShowRouteModal(true); };
  const openEditRoute = (r) => {
    setEditRouteId(r._id);
    setRouteForm({ name: r.name, vehicle_id: r.vehicle_id || '', stops: r.stops || [] });
    setNewStop({ name: '', pickup_time: '', drop_time: '', monthly_fee: '' });
    setShowRouteModal(true);
  };
  const addStop = () => {
    if (!newStop.name) { toast.warn('Enter stop name'); return; }
    setRouteForm(prev => ({ ...prev, stops: [...prev.stops, { ...newStop, monthly_fee: parseFloat(newStop.monthly_fee) || 0 }] }));
    setNewStop({ name: '', pickup_time: '', drop_time: '', monthly_fee: '' });
  };
  const removeStop = (idx) => setRouteForm(prev => ({ ...prev, stops: prev.stops.filter((_, i) => i !== idx) }));
  const saveRoute = async (e) => {
    e.preventDefault(); setSavingRoute(true);
    try {
      if (editRouteId) { await api.put(`/transport/routes/${editRouteId}`, routeForm); toast.success('Route updated'); }
      else { await api.post('/transport/routes', routeForm); toast.success('Route created'); }
      setShowRouteModal(false); fetchRoutes();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSavingRoute(false); }
  };
  const deleteRoute = async (id) => {
    if (!window.confirm('Delete this route?')) return;
    try { await api.delete(`/transport/routes/${id}`); toast.success('Deleted'); fetchRoutes(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  // Enrollment
  const enrollStudent = async (e) => {
    e.preventDefault(); setEnrolling(true);
    try { await api.post('/transport/students', enrollForm); toast.success('Student enrolled'); setShowEnrollModal(false); fetchEnrollments(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to enroll'); }
    finally { setEnrolling(false); }
  };

  const selectedRouteStops = routes.find(r => r._id === enrollForm.route_id)?.stops || [];
  const filteredStudents = students.filter(s => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (s.full_name || s.name || '').toLowerCase().includes(q) || (s.roll_number || '').toLowerCase().includes(q);
  });

  const tabs = [
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'routes', label: 'Routes' },
    { id: 'students', label: 'Students' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transport Management</h1>
          <p className="text-sm text-slate-500">Vehicles, routes and student transport</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 border border-slate-100 shadow-sm mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Vehicles */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-700">Fleet</h2>
            <button onClick={openAddVehicle} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          </div>
          {loadingVehicles ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div> :
            vehicles.length === 0 ? <div className="text-center py-16 text-slate-400">No vehicles registered.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Reg No</th><th className="text-left px-4 py-3">Type</th>
                    <th className="text-center px-4 py-3">Capacity</th><th className="text-left px-4 py-3">Driver</th>
                    <th className="text-left px-4 py-3">Driver Phone</th><th className="text-left px-4 py-3">Conductor</th>
                    <th className="text-left px-4 py-3">Conductor Phone</th><th className="text-right px-4 py-3">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {vehicles.map(v => (
                      <tr key={v._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-blue-700">{v.reg_no}</td>
                        <td className="px-4 py-3 capitalize text-slate-600">{v.type}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{v.capacity}</td>
                        <td className="px-4 py-3 text-slate-700">{v.driver_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{v.driver_phone || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{v.conductor_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{v.conductor_phone || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEditVehicle(v)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 mr-1"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteVehicle(v._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* Routes */}
      {activeTab === 'routes' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-700">Routes</h2>
            <button onClick={openAddRoute} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> Add Route
            </button>
          </div>
          {loadingRoutes ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div> :
            routes.length === 0 ? <div className="text-center py-16 text-slate-400">No routes created.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Route Name</th>
                    <th className="text-left px-4 py-3">Vehicle</th>
                    <th className="text-center px-4 py-3">Stops</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {routes.map(r => (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {vehicles.find(v => v._id === r.vehicle_id)?.reg_no || r.vehicle_reg_no || '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700">{(r.stops || []).length}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEditRoute(r)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 mr-1"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteRoute(r._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* Students */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-wrap gap-3">
            <select value={filterRoute} onChange={e => setFilterRoute(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none">
              <option value="">All Routes</option>
              {routes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
            <button onClick={() => { setEnrollForm(initEnrollForm); setStudentSearch(''); setShowEnrollModal(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> Enroll Student
            </button>
          </div>
          {loadingEnrollments ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div> :
            enrollments.length === 0 ? <div className="text-center py-16 text-slate-400">No students enrolled in transport.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3">Roll No</th>
                    <th className="text-left px-4 py-3">Route</th>
                    <th className="text-left px-4 py-3">Stop</th>
                    <th className="text-right px-4 py-3">Monthly Fee</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {enrollments.map(en => (
                      <tr key={en._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{en.student_id?.full_name}</td>
                        <td className="px-4 py-3 text-slate-500">{en.student_id?.roll_number || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{en.route_id?.name}</td>
                        <td className="px-4 py-3 text-slate-600">{en.stop_name}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">Rs. {(en.monthly_fee || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editVehicleId ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={() => setShowVehicleModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={saveVehicle} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Reg No *</label><input required value={vehicleForm.reg_no} onChange={e => setVehicleForm(p => ({ ...p, reg_no: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Type</label>
                  <select value={vehicleForm.type} onChange={e => setVehicleForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                    <option value="bus">Bus</option><option value="van">Van</option><option value="auto">Auto</option>
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>Capacity</label><input type="number" value={vehicleForm.capacity} onChange={e => setVehicleForm(p => ({ ...p, capacity: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Driver Name</label><input value={vehicleForm.driver_name} onChange={e => setVehicleForm(p => ({ ...p, driver_name: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Driver Phone</label><input value={vehicleForm.driver_phone} onChange={e => setVehicleForm(p => ({ ...p, driver_phone: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Conductor Name</label><input value={vehicleForm.conductor_name} onChange={e => setVehicleForm(p => ({ ...p, conductor_name: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Conductor Phone</label><input value={vehicleForm.conductor_phone} onChange={e => setVehicleForm(p => ({ ...p, conductor_phone: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowVehicleModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={savingVehicle} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 text-sm disabled:opacity-60">
                  {savingVehicle ? 'Saving…' : editVehicleId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editRouteId ? 'Edit Route' : 'New Route'}</h2>
              <button onClick={() => setShowRouteModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={saveRoute} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div><label className={labelCls}>Route Name *</label><input required value={routeForm.name} onChange={e => setRouteForm(p => ({ ...p, name: e.target.value }))} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Vehicle</label>
                  <select value={routeForm.vehicle_id} onChange={e => setRouteForm(p => ({ ...p, vehicle_id: e.target.value }))} className={inputCls}>
                    <option value="">None</option>
                    {vehicles.map(v => <option key={v._id} value={v._id}>{v.reg_no} ({v.type})</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Stops</label>
                  <div className="space-y-1.5 mb-3">
                    {routeForm.stops.map((stop, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-medium text-slate-700 flex-1">{stop.name}</span>
                        {stop.pickup_time && <span className="text-xs text-slate-400">{stop.pickup_time}</span>}
                        {stop.monthly_fee ? <span className="text-xs font-semibold text-blue-600">Rs. {stop.monthly_fee}</span> : null}
                        <button type="button" onClick={() => removeStop(idx)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                    <div className="text-xs font-bold text-blue-600 mb-1">Add Stop</div>
                    <input value={newStop.name} onChange={e => setNewStop(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Stop name *" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="time" value={newStop.pickup_time} onChange={e => setNewStop(p => ({ ...p, pickup_time: e.target.value }))} className={inputCls} placeholder="Pickup" />
                      <input type="time" value={newStop.drop_time} onChange={e => setNewStop(p => ({ ...p, drop_time: e.target.value }))} className={inputCls} placeholder="Drop" />
                      <input type="number" value={newStop.monthly_fee} onChange={e => setNewStop(p => ({ ...p, monthly_fee: e.target.value }))} className={inputCls} placeholder="Rs. Fee" />
                    </div>
                    <button type="button" onClick={addStop} className="w-full bg-blue-600 text-white py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-700">
                      <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Stop
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowRouteModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={savingRoute} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 text-sm disabled:opacity-60">
                  {savingRoute ? 'Saving…' : editRouteId ? 'Update' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Enroll Student</h2>
              <button onClick={() => setShowEnrollModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={enrollStudent} className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Search Student</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Name or roll number…" className="bg-transparent outline-none text-sm text-slate-700 flex-1" />
                </div>
                <select required value={enrollForm.student_id} onChange={e => setEnrollForm(p => ({ ...p, student_id: e.target.value }))} className={inputCls} size={4}>
                  <option value="">-- Select Student --</option>
                  {filteredStudents.map(s => <option key={s._id} value={s._id}>{s.full_name || s.name} {s.roll_number ? `(${s.roll_number})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Route *</label>
                <select required value={enrollForm.route_id} onChange={e => setEnrollForm(p => ({ ...p, route_id: e.target.value, stop_name: '' }))} className={inputCls}>
                  <option value="">Select Route</option>
                  {routes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
              {selectedRouteStops.length > 0 && (
                <div>
                  <label className={labelCls}>Stop *</label>
                  <select required value={enrollForm.stop_name} onChange={e => setEnrollForm(p => ({ ...p, stop_name: e.target.value }))} className={inputCls}>
                    <option value="">Select Stop</option>
                    {selectedRouteStops.map((s, i) => <option key={i} value={s.name}>{s.name}{s.monthly_fee ? ` — Rs. ${s.monthly_fee}` : ''}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEnrollModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm">Cancel</button>
                <button type="submit" disabled={enrolling} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 text-sm disabled:opacity-60">
                  {enrolling ? 'Enrolling…' : 'Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
