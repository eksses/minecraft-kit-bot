import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { X, Search, Copy, Check, ChevronRight } from 'lucide-react';

/* ─── Button ─── */
export function Button({ variant = 'primary', size = 'md', icon, loading, disabled, className = '', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150';
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-10 px-5 text-sm' };
  const variants = {
    primary: 'bg-mdb-primary text-white hover:bg-mdb-primary-hover',
    secondary: 'border border-mdb-border text-mdb-text-secondary hover:bg-mdb-surface-high',
    ghost: 'text-mdb-text-secondary hover:text-mdb-text hover:bg-mdb-surface-high',
    danger: 'bg-mdb-error-light text-mdb-error hover:bg-mdb-error hover:text-white',
    success: 'bg-mdb-success-light text-mdb-success hover:bg-mdb-success hover:text-white',
  };
  const disabledCls = disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';
  const iconOnly = icon && !children;

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabledCls} ${iconOnly ? 'px-0 aspect-square' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : children}
    </button>
  );
}

/* ─── IconButton ─── */
export function IconButton({ icon: Icon, size = 'md', tooltip, className = '', ...props }) {
  const sizes = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' };
  const iconSizes = { sm: 16, md: 18, lg: 20 };

  return (
    <Tooltip content={tooltip}>
      <button
        className={`inline-flex items-center justify-center rounded-lg text-mdb-text-secondary hover:text-mdb-text hover:bg-mdb-surface-high transition-colors ${sizes[size]} ${className}`}
        {...props}
      >
        <Icon size={iconSizes[size]} />
      </button>
    </Tooltip>
  );
}

/* ─── Input ─── */
export function Input({ label, error, helperText, size = 'md', className = '', ...props }) {
  const h = size === 'lg' ? 'h-12' : 'h-10';
  const focus = error
    ? 'border-mdb-error ring-2 ring-mdb-error/20'
    : 'border-mdb-border focus:border-mdb-primary focus:ring-2 focus:ring-mdb-primary/20';

  return (
    <div className={className}>
      {label && <label className="text-xs font-medium text-mdb-text-secondary mb-1.5 block">{label}</label>}
      <input
        className={`w-full bg-mdb-bg border rounded-lg px-3.5 ${h} text-sm text-mdb-text placeholder:text-mdb-text-muted outline-none transition-colors ${focus}`}
        {...props}
      />
      {error && <p className="text-xs text-mdb-error mt-1">{error}</p>}
      {!error && helperText && <p className="text-xs text-mdb-text-muted mt-1">{helperText}</p>}
    </div>
  );
}

/* ─── Select ─── */
export function Select({ label, options = [], size = 'md', className = '', ...props }) {
  const h = size === 'lg' ? 'h-12' : 'h-10';

  return (
    <div className={className}>
      {label && <label className="text-xs font-medium text-mdb-text-secondary mb-1.5 block">{label}</label>}
      <select
        className={`w-full bg-mdb-bg border border-mdb-border rounded-lg px-3.5 ${h} text-sm text-mdb-text outline-none focus:border-mdb-primary focus:ring-2 focus:ring-mdb-primary/20 transition-colors appearance-none cursor-pointer`}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ─── Card ─── */
export function Card({ variant = 'default', padding = 'md', className = '', children }) {
  const pads = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  const variants = {
    default: 'bg-mdb-surface rounded-xl border border-mdb-border',
    highlighted: 'bg-mdb-surface rounded-xl border border-mdb-primary/30',
    flat: 'bg-mdb-surface rounded-xl',
  };

  return (
    <div className={`${variants[variant]} ${pads[padding]} ${className}`}>
      {children}
    </div>
  );
}

/* ─── CardHeader ─── */
export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-b border-mdb-border ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-mdb-text">{title}</h3>
        {subtitle && <p className="text-xs text-mdb-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ─── StatCard ─── */
export function StatCard({ label, value, icon: Icon, trend, color = 'default', className = '' }) {
  const colors = {
    default: 'text-mdb-text',
    success: 'text-mdb-success',
    warning: 'text-mdb-warning',
    error: 'text-mdb-error',
  };
  const iconColors = {
    default: 'text-mdb-text-muted',
    success: 'text-mdb-success/40',
    warning: 'text-mdb-warning/40',
    error: 'text-mdb-error/40',
  };
  const trendIcons = { up: '↑', down: '↓', neutral: '—' };
  const trendColors = { up: 'text-mdb-success', down: 'text-mdb-error', neutral: 'text-mdb-text-muted' };

  return (
    <div className={`bg-mdb-surface rounded-xl border border-mdb-border p-5 relative overflow-hidden ${className}`}>
      {Icon && <Icon size={48} className={`absolute -right-2 -bottom-2 ${iconColors[color]}`} strokeWidth={1} />}
      <p className="text-xs font-medium text-mdb-text-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
      {trend && (
        <span className={`text-xs font-medium mt-1 inline-flex items-center gap-0.5 ${trendColors[trend]}`}>
          {trendIcons[trend]} {trend}
        </span>
      )}
    </div>
  );
}

/* ─── Badge ─── */
export function Badge({ variant = 'default', size = 'sm', dot, className = '', children }) {
  const variants = {
    default: 'bg-mdb-surface-high text-mdb-text-secondary',
    success: 'bg-mdb-success-light text-mdb-success',
    error: 'bg-mdb-error-light text-mdb-error',
    warning: 'bg-mdb-warning-light text-mdb-warning',
    info: 'bg-mdb-primary-light text-mdb-primary',
  };
  const sizes = { sm: 'text-[11px]', md: 'text-xs' };
  const dotColor = {
    default: 'bg-mdb-text-muted',
    success: 'bg-mdb-success',
    error: 'bg-mdb-error',
    warning: 'bg-mdb-warning',
    info: 'bg-mdb-primary',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor[variant]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ─── StatusBadge ─── */
export function StatusBadge({ status }) {
  const map = {
    IDLE: 'success', ONLINE: 'success', COMPLETED: 'success',
    WORKING: 'warning', ON_DELIVERY: 'warning', ACTIVE: 'warning', IN_PROGRESS: 'warning', PENDING: 'info',
    BUSY: 'error', ERROR: 'error', FAILED: 'error',
    OFFLINE: 'default',
  };
  return <Badge variant={map[status] || 'default'} dot>{status}</Badge>;
}

/* ─── Tabs ─── */
export function Tabs({ items = [], value, onChange, variant = 'underline', className = '' }) {
  if (variant === 'pills' || variant === 'segmented') {
    const bg = variant === 'segmented' ? 'bg-mdb-surface-high' : 'bg-mdb-surface border border-mdb-border';
    return (
      <div className={`flex gap-1 p-1 rounded-xl ${bg} ${className}`} role="tablist">
        {items.map(item => (
          <button
            key={item.id}
            role="tab"
            aria-selected={value === item.id}
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex-1 justify-center ${
              value === item.id
                ? 'bg-mdb-surface-high text-mdb-text shadow-sm'
                : 'text-mdb-text-muted hover:text-mdb-text'
            }`}
          >
            {item.icon && <item.icon size={16} />}
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex gap-1 border-b border-mdb-border ${className}`} role="tablist">
      {items.map(item => (
        <button
          key={item.id}
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            value === item.id
              ? 'border-mdb-primary text-mdb-primary'
              : 'border-transparent text-mdb-text-muted hover:text-mdb-text'
          }`}
        >
          {item.icon && <item.icon size={16} />}
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ─── TabPanel ─── */
export function TabPanel({ tabId, activeTab, children, className = '' }) {
  if (tabId !== activeTab) return null;
  return <div role="tabpanel" className={className}>{children}</div>;
}

/* ─── EmptyState ─── */
export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {Icon && <Icon size={48} className="text-mdb-text-muted" strokeWidth={1} />}
      <h3 className="text-base font-medium text-mdb-text mt-4">{title}</h3>
      <p className="text-sm text-mdb-text-muted mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ─── LoadingState ─── */
export function LoadingState({ variant = 'spinner', text, size = 'md', className = '' }) {
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`h-4 rounded-lg bg-mdb-surface-high animate-pulse`} style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`flex items-center gap-2 text-sm text-mdb-text-muted ${className}`}>
        <Spinner size={size} />
        {text && <span>{text}</span>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Spinner size={size} />
      {text && <p className="text-sm text-mdb-text-muted mt-3">{text}</p>}
    </div>
  );
}

/* ─── Modal ─── */
export function Modal({ isOpen, onClose, title, size = 'md', children }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', full: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${widths[size]} bg-mdb-surface border border-mdb-border rounded-xl shadow-2xl animate-fade-in`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mdb-border">
          <h2 className="text-base font-semibold text-mdb-text">{title}</h2>
          <IconButton icon={X} size="sm" onClick={onClose} aria-label="Close" />
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Drawer ─── */
export function Drawer({ isOpen, onClose, title, side = 'right', children }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pos = side === 'left' ? 'left-0 rounded-r-xl' : 'right-0 rounded-l-xl';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative ml-auto w-full max-w-md bg-mdb-surface border-mdb-border shadow-2xl flex flex-col animate-slide-in-right ${pos}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mdb-border">
          <h2 className="text-base font-semibold text-mdb-text">{title}</h2>
          <IconButton icon={X} size="sm" onClick={onClose} aria-label="Close" />
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── FormGroup ─── */
export function FormGroup({ label, error, required, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label className="text-xs font-medium text-mdb-text-secondary mb-1.5 block">
          {label} {required && <span className="text-mdb-error">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-mdb-error mt-1">{error}</p>}
    </div>
  );
}

/* ─── FormRow ─── */
export function FormRow({ gap = 'md', className = '', children }) {
  const gaps = { sm: 'gap-2', md: 'gap-3', lg: 'gap-5' };
  return <div className={`grid grid-cols-1 sm:grid-cols-2 ${gaps[gap]} ${className}`}>{children}</div>;
}

/* ─── Divider ─── */
export function Divider({ vertical, className = '' }) {
  return vertical
    ? <div className={`w-px h-6 bg-mdb-border ${className}`} aria-hidden="true" />
    : <hr className={`border-t border-mdb-border ${className}`} aria-hidden="true" />;
}

/* ─── Spinner ─── */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return <span className={`inline-block border-2 border-mdb-border border-t-mdb-primary rounded-full animate-spin ${sizes[size]} ${className}`} aria-label="Loading" role="status" />;
}

/* ─── Avatar ─── */
export function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  if (src) {
    return <img src={src} alt={name || ''} className={`${sizes[size]} rounded-full object-cover ${className}`} />;
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-mdb-surface-high text-mdb-text-muted font-medium flex items-center justify-center ${className}`}
      aria-label={name}
    >
      {initial}
    </div>
  );
}

/* ─── Tooltip ─── */
export function Tooltip({ content, children, side = 'top' }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  if (!content) return children;

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={`absolute ${positions[side]} z-50 px-2.5 py-1 rounded-lg bg-mdb-surface-highest text-xs text-mdb-text shadow-lg border border-mdb-border whitespace-nowrap pointer-events-none`}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   NEW COMPONENTS
   ═══════════════════════════════════════════════ */

/* ─── Dropdown ─── */
export function Dropdown({ trigger, items = [], align = 'left', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [open]);

  const alignCls = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div className={`relative inline-flex ${className}`} ref={ref}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className={`absolute top-full mt-1 z-50 ${alignCls} bg-mdb-surface rounded-xl border border-mdb-border shadow-xl py-1 min-w-[180px] animate-scale-up`}>
          {items.map((item, i) => {
            if (item.divider) return <div key={i} className="border-t border-mdb-border my-1" />;
            return (
              <button
                key={i}
                onClick={() => { item.onClick?.(); setOpen(false); }}
                disabled={item.disabled}
                className={`w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  item.danger
                    ? 'text-mdb-error hover:bg-mdb-error-light'
                    : 'text-mdb-text-secondary hover:bg-mdb-surface-high hover:text-mdb-text'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {item.icon && <item.icon size={16} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Toggle ─── */
export function Toggle({ checked, onChange, label, disabled, className = '' }) {
  return (
    <label className={`inline-flex items-center gap-2.5 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-mdb-success' : 'bg-mdb-surface-high'}`}
      >
        <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      {label && <span className="text-sm text-mdb-text-secondary">{label}</span>}
    </label>
  );
}

/* ─── SearchInput ─── */
export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mdb-text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 bg-mdb-bg border border-mdb-border rounded-lg pl-10 pr-10 text-sm text-mdb-text placeholder:text-mdb-text-muted outline-none focus:border-mdb-primary focus:ring-2 focus:ring-mdb-primary/20 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-mdb-text-muted hover:text-mdb-text transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/* ─── Table ─── */
export function Table({ columns = [], data = [], onRowClick, emptyMessage = 'No data', striped, className = '' }) {
  return (
    <div className={`bg-mdb-surface rounded-xl border border-mdb-border overflow-hidden ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-mdb-surface-high">
            {columns.map(col => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-mdb-text-muted"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-mdb-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-mdb-border transition-colors last:border-b-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-mdb-surface-high/50' : ''
                } ${striped && i % 2 === 0 ? 'bg-mdb-surface-high/30' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm text-mdb-text">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Alert ─── */
export function Alert({ variant = 'info', title, children, dismissible, onClose, icon: Icon, className = '' }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const styles = {
    info: 'bg-mdb-primary-light text-mdb-primary border-mdb-primary/20',
    success: 'bg-mdb-success-light text-mdb-success border-mdb-success/20',
    warning: 'bg-mdb-warning-light text-mdb-warning border-mdb-warning/20',
    error: 'bg-mdb-error-light text-mdb-error border-mdb-error/20',
  };

  return (
    <div className={`rounded-xl p-4 flex gap-3 border ${styles[variant]} ${className}`}>
      {Icon && (
        <div className="flex-shrink-0 mt-0.5">
          <Icon size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-sm">{title}</p>}
        {children && <div className={`text-sm opacity-90 ${title ? 'mt-1' : ''}`}>{children}</div>}
      </div>
      {dismissible && (
        <button
          onClick={() => { setVisible(false); onClose?.(); }}
          className="flex-shrink-0 p-0.5 rounded-lg hover:bg-black/10 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/* ─── Progress ─── */
export function Progress({ value = 0, variant = 'default', size = 'md', label, showValue, className = '' }) {
  const clamped = Math.max(0, Math.min(100, value));
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  const colors = {
    default: 'bg-mdb-primary',
    success: 'bg-mdb-success',
    warning: 'bg-mdb-warning',
    error: 'bg-mdb-error',
  };

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-mdb-text-muted">{label}</span>}
          {showValue && <span className="text-xs font-medium text-mdb-text-muted">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className={`bg-mdb-surface-high rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[variant]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Breadcrumb ─── */
export function Breadcrumb({ items = [], separator = '/', className = '' }) {
  return (
    <nav className={`flex items-center gap-1.5 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <span className="text-mdb-text-muted">{separator}</span>}
            {isLast || !item.href ? (
              <span className="text-mdb-text font-medium">{item.label}</span>
            ) : (
              <button
                onClick={item.onClick}
                className="text-mdb-text-secondary hover:text-mdb-text transition-colors"
              >
                {item.label}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

/* ─── Chip ─── */
export function Chip({ label, variant = 'default', removable, onRemove, onClick, className = '' }) {
  const variants = {
    default: 'bg-mdb-surface-high text-mdb-text-secondary',
    success: 'bg-mdb-success-light text-mdb-success',
    warning: 'bg-mdb-warning-light text-mdb-warning',
    error: 'bg-mdb-error-light text-mdb-error',
    info: 'bg-mdb-primary-light text-mdb-primary',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}>
      {onClick ? <button onClick={onClick} className="hover:opacity-80">{label}</button> : label}
      {removable && (
        <button onClick={onRemove} className="ml-0.5 rounded-full hover:bg-black/10 p-0.5 transition-colors">
          <X size={12} />
        </button>
      )}
    </span>
  );
}

/* ─── Switch (segmented) ─── */
export function Switch({ options = [], value, onChange, className = '' }) {
  return (
    <div className={`bg-mdb-surface rounded-lg p-0.5 border border-mdb-border flex ${className}`} role="radiogroup">
      {options.map(opt => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md text-center transition-all ${
            value === opt.value
              ? 'bg-mdb-surface-high text-mdb-text shadow-sm'
              : 'text-mdb-text-muted hover:text-mdb-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─── NumberInput ─── */
export function NumberInput({ value, onChange, min, max, step = 1, label, className = '' }) {
  const clamp = (v) => {
    let n = v;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return n;
  };

  return (
    <div className={className}>
      {label && <label className="text-xs font-medium text-mdb-text-secondary mb-1.5 block">{label}</label>}
      <div className="flex items-center">
        <button
          onClick={() => onChange(clamp(value - step))}
          disabled={min != null && value <= min}
          className="h-10 w-10 flex items-center justify-center bg-mdb-surface-high hover:bg-mdb-surface-highest text-mdb-text-secondary rounded-l-lg transition-colors disabled:opacity-50"
        >
          <span className="text-lg leading-none">−</span>
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          className="h-10 w-16 text-center border-x border-mdb-border bg-mdb-bg text-sm text-mdb-text outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => onChange(clamp(value + step))}
          disabled={max != null && value >= max}
          className="h-10 w-10 flex items-center justify-center bg-mdb-surface-high hover:bg-mdb-surface-highest text-mdb-text-secondary rounded-r-lg transition-colors disabled:opacity-50"
        >
          <span className="text-lg leading-none">+</span>
        </button>
      </div>
    </div>
  );
}

/* ─── CopyButton ─── */
export function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs text-mdb-text-muted hover:text-mdb-text transition-colors ${className}`}
    >
      {copied ? <Check size={14} className="text-mdb-success" /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

/* ─── ConfirmAction ─── */
export function ConfirmAction({ onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">{children}</span>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={title} size="sm">
        <p className="text-sm text-mdb-text-secondary">{message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setOpen(false)}>{cancelLabel}</Button>
          <Button variant="danger" onClick={() => { onConfirm?.(); setOpen(false); }}>{confirmLabel}</Button>
        </div>
      </Modal>
    </>
  );
}

/* ─── Skeleton ─── */
export function Skeleton({ variant = 'text', width, height, lines = 1, className = '' }) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`bg-mdb-surface-high rounded-lg animate-pulse ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
            style={{ height: height || '16px' }}
          />
        ))}
      </div>
    );
  }

  const baseClass = variant === 'circular' ? 'rounded-full' : 'rounded-lg';
  return (
    <div
      className={`bg-mdb-surface-high animate-pulse ${baseClass} ${className}`}
      style={{ width: width || (variant === 'circular' ? '40px' : variant === 'rectangular' ? '100%' : '100%'), height: height || (variant === 'circular' ? '40px' : variant === 'rectangular' ? '80px' : '16px') }}
    />
  );
}

/* ─── AvatarGroup ─── */
export function AvatarGroup({ avatars = [], max = 3, size = 'md', className = '' }) {
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs' };
  const overlap = size === 'sm' ? '-ml-2' : '-ml-3';
  const shown = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={`flex items-center ${className}`}>
      {shown.map((a, i) => (
        <div key={i} className={`${i > 0 ? overlap : ''} ring-2 ring-mdb-bg rounded-full`}>
          {a.src ? (
            <img src={a.src} alt={a.name || ''} className={`${sizes[size]} rounded-full object-cover`} />
          ) : (
            <div className={`${sizes[size]} rounded-full bg-mdb-surface-high text-mdb-text-muted font-medium flex items-center justify-center`}>
              {a.name ? a.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className={`${overlap} ring-2 ring-mdb-bg`}>
          <div className={`${sizes[size]} rounded-full bg-mdb-surface-high text-mdb-text-muted font-medium flex items-center justify-center`}>
            +{remaining}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── KeyCombo ─── */
export function KeyCombo({ keys = [], className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-mdb-surface-high border border-mdb-border rounded text-[11px] font-mono text-mdb-text-secondary shadow-sm"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
