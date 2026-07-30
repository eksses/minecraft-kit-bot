import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]);
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast bg-mdb-surface border border-mdb-surface-high p-4 min-w-[280px] max-w-[400px] flex items-center gap-2 text-sm text-mdb-text ${toast.type === 'success' ? 'border-l-[3px] border-l-mdb-online' : toast.type === 'error' ? 'border-l-[3px] border-l-mdb-status-error' : toast.type === 'warning' ? 'border-l-[3px] border-l-mdb-working' : 'border-l-[3px] border-l-mdb-primary'}`}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          <span className="text-base">
            {toast.type === 'success' && '\u2713'}
            {toast.type === 'error' && '\u2715'}
            {toast.type === 'warning' && '\u26A0'}
            {toast.type === 'info' && '\u2139'}
          </span>
          <div className="flex-1">
            <div className="font-semibold">{toast.title}</div>
            {toast.message && <div className="text-xs text-mdb-text-muted mt-0.5">{toast.message}</div>}
          </div>
          <button className="text-mdb-text-muted hover:text-mdb-text text-lg" onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}>
            \u00d7
          </button>
        </div>
      ))}
    </div>
  );
}
