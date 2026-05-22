import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx';
// Register service worker in production only
if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: false });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <ConfirmDialog />
    <PWAInstallPrompt />
    <ToastContainer
      position="top-right"
      autoClose={3500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      theme="light"
      toastStyle={{
        borderRadius: '14px',
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    />
  </React.StrictMode>,
)
