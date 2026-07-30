import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './ui';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
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

function Toast({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const colorClass = {
    success: 'bg-mdb-success',
    error: 'bg-mdb-error',
    warning: 'bg-mdb-warning',
    info: 'bg-mdb-primary',
  }[toast.type] || 'bg-mdb-primary';

  return (
    <div
      className="bg-mdb-surface rounded-xl border border-mdb-border shadow-xl p-4 flex gap-3 min-w-[300px] max-w-[400px] animate-slide-in-right"
      role="alert"
    >
      <div className={`w-1 rounded-full flex-shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-mdb-text">{toast.title}</p>
        {toast.message && <p className="text-xs text-mdb-text-muted mt-0.5">{toast.message}</p>}
      </div>
      <IconButton icon={X} size="sm" onClick={() => onRemove(toast.id)} className="flex-shrink-0" />
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-md:left-4 max-md:right-4 max-md:bottom-20"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
