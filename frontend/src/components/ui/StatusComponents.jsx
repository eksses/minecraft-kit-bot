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
