import { useEffect, useState } from 'react';
import api from '../services/api';
import { Save, Upload, Bell, MessageSquare, Building2, TestTube2, CheckCircle, Loader2 } from 'lucide-react';

const TABS = ['Institute', 'Notifications', 'SMS / WhatsApp', 'Finance'];

const Field = ({ label, children, hint }) => (
  <div>
    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
    {children}
    {hint && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{hint}</p>}
  </div>
);
const Input = (props) => (
  <input {...props} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box', ...props.style }} />
);
const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: checked ? '#6366f1' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
    </div>
    <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</span>
  </label>
);

export default function Settings() {
  const [tab, setTab]       = useState('Institute');
  const [form, setForm]     = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [toast, setToast]   = useState('');

  useEffect(() => {
    api.get('/settings').then(r => { setForm(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      showToast('Settings saved successfully!');
    } catch (e) { showToast(e.response?.data?.message || 'Save failed', true); }
    setSaving(false);
  };

  const testSMS = async () => {
    if (!testPhone) return;
    setTestResult(null);
    try {
      const r = await api.post('/settings/test-sms', { phone: testPhone });
      setTestResult({ ok: true, msg: r.data.dev ? 'SMS logged to console (dev mode)' : 'SMS sent successfully!' });
    } catch (e) { setTestResult({ ok: false, msg: e.response?.data?.message || 'Failed' }); }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const r = await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      set('logo_url', r.data.logo_url);
      showToast('Logo updated!');
    } catch { showToast('Logo upload failed', true); }
  };

  const showToast = (msg, err) => {
    setToast({ msg, err });
    setTimeout(() => setToast(''), 3000);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} /></div>;

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.err ? '#ef4444' : '#10b981', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Institute Settings</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Configure your institute, notifications and integrations</p>
        </div>
        <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#6366f1' : '#64748b', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap' }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>

        {/* ── INSTITUTE ── */}
        {tab === 'Institute' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              {form.logo_url
                ? <img src={`http://localhost:5000${form.logo_url}`} alt="logo" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                : <div style={{ width: 72, height: 72, borderRadius: 12, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', fontWeight: 800 }}>{(form.name || 'I').charAt(0)}</div>
              }
              <div>
                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 16, margin: 0 }}>{form.name || 'Institute Name'}</p>
                <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 10px' }}>Upload a square logo (PNG/JPG, max 2MB)</p>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#6366f1', color: '#fff', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Upload size={13} /> Upload Logo
                  <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              <Field label="Institute Name"><Input value={form.name || ''} onChange={e => set('name', e.target.value)} /></Field>
              <Field label="Tagline / Slogan"><Input value={form.tagline || ''} onChange={e => set('tagline', e.target.value)} placeholder="e.g. Excellence in Education" /></Field>
              <Field label="Phone"><Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
              <Field label="Email"><Input value={form.email || ''} onChange={e => set('email', e.target.value)} /></Field>
              <Field label="Website"><Input value={form.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://..." /></Field>
              <Field label="City"><Input value={form.city || ''} onChange={e => set('city', e.target.value)} /></Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Address">
                  <textarea value={form.address || ''} onChange={e => set('address', e.target.value)} rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </Field>
              </div>
              <Field label="Current Academic Session"><Input value={form.academic_session || ''} onChange={e => set('academic_session', e.target.value)} placeholder="e.g. 2025-2026" /></Field>
              <Field label="Currency Symbol"><Input value={form.currency_symbol || ''} onChange={e => set('currency_symbol', e.target.value)} placeholder="Rs." /></Field>
              <Field label="Facebook URL"><Input value={form.facebook_url || ''} onChange={e => set('facebook_url', e.target.value)} /></Field>
              <Field label="Instagram URL"><Input value={form.instagram_url || ''} onChange={e => set('instagram_url', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab === 'Notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#0369a1', fontWeight: 600 }}>These toggles control which events trigger SMS and WhatsApp notifications to parents/students.</p>
            </div>
            <Toggle checked={!!form.notify_on_absence} onChange={() => set('notify_on_absence', !form.notify_on_absence)} label="Notify parents when student is marked Absent" />
            <Toggle checked={!!form.notify_on_fee_due} onChange={() => set('notify_on_fee_due', !form.notify_on_fee_due)} label="Notify parents when Fee invoice is due or overdue" />
            <Toggle checked={!!form.notify_on_result}  onChange={() => set('notify_on_result',  !form.notify_on_result)}  label="Notify parents when Exam Results are published" />
            <Toggle checked={!!form.notify_on_fine}    onChange={() => set('notify_on_fine',    !form.notify_on_fine)}    label="Notify parents when a Fine is issued to student" />
          </div>
        )}

        {/* ── SMS / WHATSAPP ── */}
        {tab === 'SMS / WhatsApp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* SMS Section */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <MessageSquare size={18} color="#6366f1" />
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e293b' }}>SMS Configuration</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                <Toggle checked={!!form.sms_enabled} onChange={() => set('sms_enabled', !form.sms_enabled)} label="Enable SMS Notifications" />
                <Field label="SMS Provider">
                  <select value={form.sms_provider || 'none'} onChange={e => set('sms_provider', e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' }}>
                    <option value="none">None (Console Log)</option>
                    <option value="twilio">Twilio</option>
                    <option value="webhook">Custom Webhook</option>
                  </select>
                </Field>
                <Field label="Sender ID / Number"><Input value={form.sms_sender || ''} onChange={e => set('sms_sender', e.target.value)} placeholder="+923001234567 or INFLO" /></Field>
                {form.sms_provider === 'twilio' && <>
                  <Field label="Twilio Account SID"><Input value={form.twilio_account_sid || ''} onChange={e => set('twilio_account_sid', e.target.value)} /></Field>
                  <Field label="Twilio Auth Token" hint="Stored securely, not shown after save"><Input type="password" value={form.twilio_auth_token || ''} onChange={e => set('twilio_auth_token', e.target.value)} /></Field>
                </>}
                {form.sms_provider === 'webhook' && <>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Webhook URL" hint="POST endpoint that accepts: {to, message, sender, api_key}"><Input value={form.sms_webhook_url || ''} onChange={e => set('sms_webhook_url', e.target.value)} placeholder="https://your-sms-provider.com/api/send" /></Field>
                  </div>
                  <Field label="API Key"><Input type="password" value={form.sms_api_key || ''} onChange={e => set('sms_api_key', e.target.value)} /></Field>
                </>}
              </div>

              {/* Test SMS */}
              <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Field label="Test Phone Number"><Input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="03001234567" /></Field>
                </div>
                <button onClick={testSMS} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <TestTube2 size={15} /> Send Test SMS
                </button>
              </div>
              {testResult && (
                <div style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, background: testResult.ok ? '#f0fdf4' : '#fef2f2', color: testResult.ok ? '#166534' : '#dc2626', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> {testResult.msg}
                </div>
              )}
            </div>

            {/* WhatsApp Section */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <MessageSquare size={18} color="#25d366" />
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e293b' }}>WhatsApp Configuration</h3>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                  Requires a WhatsApp Business API provider (e.g. <strong>WaBlas, Ultramsg, CallMeBot</strong>).
                  Configure your provider's webhook URL and API key below.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                <Toggle checked={!!form.whatsapp_enabled} onChange={() => set('whatsapp_enabled', !form.whatsapp_enabled)} label="Enable WhatsApp Notifications" />
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="WhatsApp Webhook URL"><Input value={form.whatsapp_webhook_url || ''} onChange={e => set('whatsapp_webhook_url', e.target.value)} placeholder="https://api.wablas.com/send" /></Field>
                </div>
                <Field label="API Key"><Input type="password" value={form.whatsapp_api_key || ''} onChange={e => set('whatsapp_api_key', e.target.value)} /></Field>
              </div>
            </div>
          </div>
        )}

        {/* ── FINANCE ── */}
        {tab === 'Finance' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            <Field label="Currency" hint="3-letter code — e.g. PKR"><Input value={form.currency || ''} onChange={e => set('currency', e.target.value)} /></Field>
            <Field label="Currency Symbol"><Input value={form.currency_symbol || ''} onChange={e => set('currency_symbol', e.target.value)} placeholder="Rs." /></Field>
            <Field label="Default Fee Due Day" hint="Day of month fees are due (1–28)"><Input type="number" min={1} max={28} value={form.fee_due_day || 10} onChange={e => set('fee_due_day', e.target.value)} /></Field>
            <Field label="Late Fine Per Day (Rs.)" hint="Charged per day after due date (0 = disabled)"><Input type="number" min={0} value={form.fine_per_day || 0} onChange={e => set('fine_per_day', e.target.value)} /></Field>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
