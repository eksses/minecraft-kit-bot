import { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

  const styles = {
    success: 'border-l-4 border-l-emerald-400 bg-emerald-400/5',
    error: 'border-l-4 border-l-red-400 bg-red-400/5',
    info: 'border-l-4 border-l-mdb-primary bg-mdb-primary/5',
    warning: 'border-l-4 border-l-amber-400 bg-amber-400/5',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'i',
  };

  const iconColors = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-mdb-primary',
  };

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-lg shadow-lg border border-mdb-border bg-mdb-surface min-w-[280px] max-w-[400px] animate-slide-in-right ${styles[toast.type] || styles.info}`}
      role="alert"
    >
      <span className={`text-sm font-bold mt-0.5 ${iconColors[toast.type] || iconColors.info}`}>
        {icons[toast.type] || icons.info}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-mdb-text">{toast.title}</div>
        {toast.message && <div className="text-xs text-mdb-text-muted mt-0.5">{toast.message}</div>}
      </div>
      <button
        className="text-mdb-text-muted hover:text-mdb-text text-sm p-0.5 rounded hover:bg-mdb-surface-high transition-colors"
        onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
      >
        ×
      </button>
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
