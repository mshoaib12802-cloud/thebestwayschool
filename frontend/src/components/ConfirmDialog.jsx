import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, CheckCircle2, X } from 'lucide-react';

export default function ConfirmDialog() {
  const [dialog, setDialog] = useState(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const handler = (e) => { setLeaving(false); setDialog(e.detail); };
    window.addEventListener('app:confirm', handler);
    return () => window.removeEventListener('app:confirm', handler);
  }, []);

  if (!dialog) return null;

  const { message, options = {}, resolve } = dialog;
  const isDanger    = options.danger !== false; // default danger=true
  const confirmText = options.confirmText || (isDanger ? 'Delete' : 'Confirm');
  const cancelText  = options.cancelText  || 'Cancel';
  const title       = options.title || (isDanger ? 'Are you sure?' : 'Confirm action');

  const finish = (result) => {
    setLeaving(true);
    setTimeout(() => { resolve(result); setDialog(null); setLeaving(false); }, 180);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
               animation: leaving ? 'fadeOut 0.18s ease forwards' : 'fadeIn 0.18s ease forwards' }}
      onClick={(e) => { if (e.target === e.currentTarget) finish(false); }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>

      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: leaving ? 'fadeOut 0.18s ease forwards' : 'slideUp 0.2s ease forwards' }}
      >
        {/* Icon strip */}
        <div className={`px-6 pt-6 pb-4 flex flex-col items-center text-center`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
            isDanger ? 'bg-rose-100' : 'bg-indigo-100'
          }`}>
            {isDanger
              ? <Trash2 size={26} className="text-rose-500"/>
              : <CheckCircle2 size={26} className="text-indigo-500"/>
            }
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 mb-1">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => finish(false)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            <X size={15}/> {cancelText}
          </button>
          <button
            onClick={() => finish(true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-md hover:scale-105 active:scale-95 ${
              isDanger
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200'
            }`}
          >
            {isDanger ? <Trash2 size={15}/> : <CheckCircle2 size={15}/>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
