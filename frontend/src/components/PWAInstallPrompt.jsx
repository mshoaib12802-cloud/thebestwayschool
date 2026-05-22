import { useState, useEffect } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall]       = useState(false);
  const [showIOSHint, setShowIOSHint]       = useState(false);
  const [showUpdate, setShowUpdate]         = useState(false);

  // Android / Chrome install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('pwa-dismissed')) {
        setTimeout(() => setShowInstall(true), 8000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // iOS: show manual "Add to Home Screen" hint
  useEffect(() => {
    if (isIOS() && !isInStandalone() && !localStorage.getItem('pwa-dismissed')) {
      setTimeout(() => setShowIOSHint(true), 8000);
    }
  }, []);

  // Service worker update
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setShowUpdate(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
    if (outcome === 'dismissed') localStorage.setItem('pwa-dismissed', '1');
  };

  const dismiss = () => {
    setShowInstall(false);
    setShowIOSHint(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  return (
    <>
      {/* ── Android install banner ─────────────────────── */}
      {showInstall && (
        <div style={styles.banner}>
          <img src="/icons/icon-192.png" alt="App icon" style={styles.appIcon} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.title}>Install App</p>
            <p style={styles.sub}>Add to home screen for the best experience</p>
          </div>
          <button onClick={handleInstall} style={styles.installBtn}>
            <Download size={14} /> Install
          </button>
          <button onClick={dismiss} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── iOS hint banner ────────────────────────────── */}
      {showIOSHint && (
        <div style={styles.banner}>
          <img src="/icons/icon-192.png" alt="App icon" style={styles.appIcon} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.title}>Install on iPhone</p>
            <p style={styles.sub}>
              Tap the Share button, then &ldquo;Add to Home Screen&rdquo;
            </p>
          </div>
          <button onClick={dismiss} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── Update toast ───────────────────────────────── */}
      {showUpdate && (
        <div style={styles.updateToast}>
          <RefreshCw size={14} color="#a5b4fc" />
          <span style={{ color: '#c7d2fe', fontSize: 13 }}>New update available</span>
          <button onClick={() => window.location.reload()} style={styles.reloadBtn}>
            Reload
          </button>
          <button onClick={() => setShowUpdate(false)} style={styles.closeBtn}>
            <X size={15} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(110%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeDown {
          from { transform: translate(-50%, -16px); opacity: 0; }
          to   { transform: translate(-50%, 0);     opacity: 1; }
        }
      `}</style>
    </>
  );
}

const styles = {
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    flexShrink: 0,
    objectFit: 'cover',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
    background: 'rgba(10, 8, 35, 0.97)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderTop: '1px solid rgba(99,102,241,0.35)',
    animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
  },
  title: {
    color: 'white',
    fontWeight: 700,
    fontSize: 14,
    margin: 0,
    lineHeight: 1.3,
  },
  sub: {
    color: '#a5b4fc',
    fontSize: 12,
    margin: 0,
    marginTop: 2,
    lineHeight: 1.4,
  },
  installBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '8px 16px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(79,70,229,0.45)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#6366f1',
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  updateToast: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    background: '#1e1b4b',
    border: '1px solid rgba(99,102,241,0.5)',
    borderRadius: 14,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap',
    animation: 'fadeDown 0.35s ease',
  },
  reloadBtn: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '4px 12px',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
  },
};
