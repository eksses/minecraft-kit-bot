export function StatusBadge({ status }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'IDLE':
      case 'ONLINE':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' };
      case 'WORKING':
      case 'ON_DELIVERY':
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' };
      case 'BUSY':
      case 'ERROR':
      case 'FAILED':
        return { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' };
      case 'OFFLINE':
        return { bg: 'bg-mdb-text-muted/10', text: 'text-mdb-text-muted', dot: 'bg-mdb-text-muted' };
      case 'PENDING':
        return { bg: 'bg-sky-500/10', text: 'text-sky-400', dot: 'bg-sky-400' };
      case 'COMPLETED':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' };
      default:
        return { bg: 'bg-mdb-text-muted/10', text: 'text-mdb-text-muted', dot: 'bg-mdb-text-muted' };
    }
  };

  const style = getStatusStyle(status);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function HealthBar({ value, max = 20 }) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const barColor = percentage > 60 ? 'bg-emerald-400' : percentage > 30 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1 text-xs text-mdb-text-muted">
        <span>HP</span>
        <span className="font-mono">{Math.round(value)}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-mdb-surface-high overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function FoodBar({ value, max = 20 }) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const barColor = percentage > 60 ? 'bg-amber-400' : percentage > 30 ? 'bg-orange-400' : 'bg-red-400';

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1 text-xs text-mdb-text-muted">
        <span>Food</span>
        <span className="font-mono">{Math.round(value)}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-mdb-surface-high overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
