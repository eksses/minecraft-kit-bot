export function HealthBar({ value, max = 20 }) {
  const pct = Math.round((value / max) * 100);
  const color = pct > 60 ? 'bg-mdb-success' : pct > 30 ? 'bg-mdb-warning' : 'bg-mdb-error';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-mdb-surface-high rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-mdb-text-muted w-6 text-right">{value}</span>
    </div>
  );
}

export function FoodBar({ value, max = 20 }) {
  const pct = Math.round((value / max) * 100);
  const color = pct > 60 ? 'bg-mdb-success' : pct > 30 ? 'bg-mdb-warning' : 'bg-mdb-error';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-mdb-surface-high rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-mdb-text-muted w-6 text-right">{value}</span>
    </div>
  );
}

export function LiveStatusDot({ status }) {
  const isOnline = status === 'ONLINE' || status === 'IDLE' || status === 'COMPLETED';
  const isWorking = status === 'WORKING' || status === 'ON_DELIVERY' || status === 'ACTIVE' || status === 'IN_PROGRESS';
  const isError = status === 'BUSY' || status === 'ERROR' || status === 'FAILED';

  const colorClass = isOnline ? 'bg-mdb-success' : isWorking ? 'bg-mdb-warning' : isError ? 'bg-mdb-error' : 'bg-mdb-text-muted';
  const pulse = status === 'ONLINE' || status === 'WORKING' || isOnline || isWorking;

  if (pulse) {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorClass} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${colorClass}`} />
      </span>
    );
  }

  return <span className={`w-2 h-2 rounded-full shrink-0 ${colorClass}`} aria-hidden="true" />;
}

export function StatusBadge({ status, className = '' }) {
  const map = {
    IDLE: 'success', ONLINE: 'success', COMPLETED: 'success',
    WORKING: 'warning', ON_DELIVERY: 'warning', ACTIVE: 'warning', IN_PROGRESS: 'warning', PENDING: 'info',
    BUSY: 'error', ERROR: 'error', FAILED: 'error',
    OFFLINE: 'default',
  };
  const variant = map[status] || 'default';
  const variants = {
    default: 'bg-mdb-surface-high text-mdb-text-secondary',
    success: 'bg-mdb-success/15 text-mdb-success',
    error: 'bg-mdb-error/15 text-mdb-error',
    warning: 'bg-mdb-warning/15 text-mdb-warning',
    info: 'bg-mdb-primary/15 text-mdb-primary',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      <LiveStatusDot status={status} />
      {status}
    </span>
  );
}
