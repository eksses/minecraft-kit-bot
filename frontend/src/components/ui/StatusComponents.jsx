export function StatusBadge({ status }) {
  const getStatusClass = (status) => {
    switch (status) {
      case 'IDLE':
      case 'ONLINE':
        return 'status-online';
      case 'WORKING':
      case 'ON_DELIVERY':
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'status-active';
      case 'BUSY':
      case 'ERROR':
      case 'FAILED':
        return 'status-error';
      case 'OFFLINE':
        return 'status-offline';
      case 'PENDING':
        return 'status-pending';
      case 'COMPLETED':
        return 'status-completed';
      default:
        return 'status-unknown';
    }
  };

  return (
    <span className={`status-badge inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-widest ${getStatusClass(status)}`}>
      <span className="status-dot w-2 h-2 shrink-0" aria-hidden="true"></span>
      <span>{status}</span>
    </span>
  );
}

export function HealthBar({ value, max = 20 }) {
  const percentage = (value / max) * 100;
  const variant = percentage > 60 ? 'success' : percentage > 30 ? 'warning' : 'danger';
  
  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1 text-[13px]">
        <span>Health</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className={`progress-bar h-1.5 bg-mdb-surface-high overflow-hidden progress-${variant}`}>
        <div className="progress-fill h-full transition-[width]" style={{width: `${percentage}%`}}></div>
      </div>
    </div>
  );
}

export function FoodBar({ value, max = 20 }) {
  const percentage = (value / max) * 100;
  const variant = percentage > 60 ? 'success' : percentage > 30 ? 'warning' : 'danger';
  
  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1 text-[13px]">
        <span>Food</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className={`progress-bar h-1.5 bg-mdb-surface-high overflow-hidden progress-${variant}`}>
        <div className="progress-fill h-full transition-[width]" style={{width: `${percentage}%`}}></div>
      </div>
    </div>
  );
}

export function BotCard({ bot, onStart, onStop, onDelete }) {
  const status = bot.liveStatus?.status || bot.status;

  return (
    <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <span className="status-badge inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-widest">
          <span className="status-dot w-2 h-2 shrink-0" style={{
            background: status === 'OFFLINE' ? 'var(--color-mdb-status-error)' :
                        status === 'ERROR' || status === 'BUSY' ? 'var(--color-mdb-status-error)' :
                        status === 'WORKING' || status === 'ON_DELIVERY' ? 'var(--color-mdb-working)' :
                        'var(--color-mdb-online)'
          }}></span>
          <span>{status}</span>
        </span>
        <div className="flex gap-2">
          {status === 'OFFLINE' ? (
            <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-online text-mdb-surface-lowest" onClick={() => onStart(bot.id)}>Start</button>
          ) : (
            <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-working text-mdb-surface-lowest" onClick={() => onStop(bot.id)}>Stop</button>
          )}
          <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10" onClick={() => onDelete(bot.id)}>Delete</button>
        </div>
      </div>
      
      <div className="flex flex-col gap-1 text-mdb-text-secondary text-sm mb-4">
        <div><strong>{bot.name}</strong></div>
        <div className="font-mono text-xs text-mdb-text-muted">{bot.username}</div>
        <div>{bot.liveStatus?.serverConfig?.name || 'Not assigned'}</div>
      </div>
      
      {bot.liveStatus?.health != null && <HealthBar value={bot.liveStatus.health} />}
      {bot.liveStatus?.food != null && <FoodBar value={bot.liveStatus.food} />}
    </div>
  );
}

export function SwarmCard({ swarm, onClick }) {
  return (
    <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-4 cursor-pointer transition-[border-color] hover:border-mdb-primary" onClick={onClick}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold">{swarm.name}</h3>
        <span className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">
          {swarm.loadBalancing}
        </span>
      </div>
      <div className="flex gap-6">
        <div className="flex flex-col">
          <span className="text-xl font-bold text-mdb-text">{swarm.stats?.totalBots || 0}</span>
          <span className="text-xs text-mdb-text-muted">Bots</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold text-mdb-online">{swarm.stats?.idleBots || 0}</span>
          <span className="text-xs text-mdb-text-muted">Idle</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold text-mdb-working">{swarm.stats?.activeTasks || 0}</span>
          <span className="text-xs text-mdb-text-muted">Active</span>
        </div>
      </div>
    </div>
  );
}

export function TaskCard({ task }) {
  return (
    <div className="bg-mdb-surface border border-mdb-surface-high p-4 mb-2">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-sm">{task.type}</span>
        <StatusBadge status={task.status} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[13px]">
          <span className="text-mdb-text-muted">Assigned Bot</span>
          <span className="text-mdb-text">{task.assignedBot?.name || 'Auto'}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-mdb-text-muted">Created</span>
          <span className="text-mdb-text">{new Date(task.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export function StatsCard({ label, value, variant = 'default' }) {
  const colorClass = {
    default: '',
    success: 'text-mdb-online',
    warning: 'text-mdb-working',
    danger: 'text-mdb-status-error',
  }[variant];

  return (
    <div className="bg-mdb-surface border border-mdb-surface-high p-6">
      <div className={`text-[28px] font-bold leading-tight tracking-tight ${colorClass}`}>{value}</div>
      <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1">{label}</div>
    </div>
  );
}
