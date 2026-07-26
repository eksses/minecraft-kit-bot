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
    <span className={`status-badge ${getStatusClass(status)}`}>
      <span className="status-dot" aria-hidden="true"></span>
      <span>{status}</span>
    </span>
  );
}

export function HealthBar({ value, max = 20 }) {
  const percentage = (value / max) * 100;
  const variant = percentage > 60 ? 'success' : percentage > 30 ? 'warning' : 'danger';
  
  return (
    <div className="progress-group">
      <div className="progress-label">
        <span>Health</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className={`progress-bar progress-${variant}`}>
        <div className="progress-fill" style={{width: `${percentage}%`}}></div>
      </div>
    </div>
  );
}

export function FoodBar({ value, max = 20 }) {
  const percentage = (value / max) * 100;
  const variant = percentage > 60 ? 'success' : percentage > 30 ? 'warning' : 'danger';
  
  return (
    <div className="progress-group">
      <div className="progress-label">
        <span>Food</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className={`progress-bar progress-${variant}`}>
        <div className="progress-fill" style={{width: `${percentage}%`}}></div>
      </div>
    </div>
  );
}

export function BotCard({ bot, onStart, onStop, onDelete }) {
  const getStatusClass = (status) => {
    switch (status) {
      case 'IDLE': return 'status-online';
      case 'WORKING':
      case 'ON_DELIVERY': return 'status-active';
      case 'BUSY':
      case 'ERROR': return 'status-error';
      default: return 'status-unknown';
    }
  };

  const status = bot.liveStatus?.status || bot.status;

  return (
    <div className="bot-card">
      <div className="bot-card-header">
        <span className="status-badge">
          <span className={`status-dot`} style={{
            background: status === 'OFFLINE' ? 'var(--status-offline)' :
                        status === 'ERROR' || status === 'BUSY' ? 'var(--status-error)' :
                        status === 'WORKING' || status === 'ON_DELIVERY' ? 'var(--status-working)' :
                        'var(--status-online)'
          }}></span>
          <span>{status}</span>
        </span>
        <div className="bot-card-actions">
          {status === 'OFFLINE' ? (
            <button className="btn btn-success btn-sm" onClick={() => onStart(bot.id)}>Start</button>
          ) : (
            <button className="btn btn-warning btn-sm" onClick={() => onStop(bot.id)}>Stop</button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(bot.id)}>Delete</button>
        </div>
      </div>
      
      <div className="bot-card-info">
        <div><strong>{bot.name}</strong></div>
        <div className="bot-card-username">{bot.username}</div>
        <div>{bot.liveStatus?.serverConfig?.name || 'Not assigned'}</div>
      </div>
      
      {bot.liveStatus?.health != null && <HealthBar value={bot.liveStatus.health} />}
      {bot.liveStatus?.food != null && <FoodBar value={bot.liveStatus.food} />}
    </div>
  );
}

export function SwarmCard({ swarm, onClick }) {
  return (
    <div className="swarm-card" onClick={onClick}>
      <div className="swarm-card-header">
        <h3 className="swarm-card-name">{swarm.name}</h3>
        <span className="form-label">
          {swarm.loadBalancing}
        </span>
      </div>
      <div className="swarm-stats">
        <div className="swarm-stat">
          <span className="swarm-stat-value">{swarm.stats?.totalBots || 0}</span>
          <span className="swarm-stat-label">Bots</span>
        </div>
        <div className="swarm-stat">
          <span className="swarm-stat-value text-success">{swarm.stats?.idleBots || 0}</span>
          <span className="swarm-stat-label">Idle</span>
        </div>
        <div className="swarm-stat">
          <span className="swarm-stat-value text-warning">{swarm.stats?.activeTasks || 0}</span>
          <span className="swarm-stat-label">Active</span>
        </div>
      </div>
    </div>
  );
}

export function TaskCard({ task }) {
  return (
    <div className="task-card">
      <div className="task-header">
        <span className="task-type">{task.type}</span>
        <StatusBadge status={task.status} />
      </div>
      <div className="task-details">
        <div className="detail">
          <span className="detail-label">Assigned Bot</span>
          <span className="detail-value">{task.assignedBot?.name || 'Auto'}</span>
        </div>
        <div className="detail">
          <span className="detail-label">Created</span>
          <span className="detail-value">{new Date(task.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export function StatsCard({ label, value, variant = 'default' }) {
  const variantClasses = {
    default: '',
    success: 'stat-success',
    warning: 'stat-warning',
    danger: 'stat-danger',
  };

  return (
    <div className={`stat-card ${variantClasses[variant]}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
