import { Circle, CircleDot, CircleOff, AlertTriangle, CheckCircle } from 'lucide-react';

// ============================================================
// Status Colors (Heatmap)
// ============================================================
export const statusColors = {
  IDLE: { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Idle' },
  READY: { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Ready' },
  WORKING: { bg: 'bg-amber-500', text: 'text-amber-500', label: 'Working' },
  ON_DELIVERY: { bg: 'bg-amber-500', text: 'text-amber-500', label: 'On Delivery' },
  EN_ROUTE: { bg: 'bg-amber-500', text: 'text-amber-500', label: 'En Route' },
  BUSY: { bg: 'bg-red-500', text: 'text-red-500', label: 'Busy' },
  MAX_CAPACITY: { bg: 'bg-red-500', text: 'text-red-500', label: 'Max Capacity' },
  ERROR: { bg: 'bg-red-500', text: 'text-red-500', label: 'Error' },
  ALERT: { bg: 'bg-red-500', text: 'text-red-500', label: 'Alert' },
  OFFLINE: { bg: 'bg-slate-500', text: 'text-slate-500', label: 'Offline' },
  UNBOUND: { bg: 'bg-slate-500', text: 'text-slate-500', label: 'Unbound' },
  DISCONNECTED: { bg: 'bg-slate-500', text: 'text-slate-500', label: 'Disconnected' },
  PENDING: { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Pending' },
  LOCKED: { bg: 'bg-purple-500', text: 'text-purple-500', label: 'Locked' },
  IN_PROGRESS: { bg: 'bg-amber-500', text: 'text-amber-500', label: 'In Progress' },
  COMPLETED: { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Completed' },
  FAILED: { bg: 'bg-red-500', text: 'text-red-500', label: 'Failed' },
  RETRY: { bg: 'bg-orange-500', text: 'text-orange-500', label: 'Retry' },
};

// ============================================================
// Status Badge Component
// ============================================================
export function StatusBadge({ status, size = 'md' }) {
  const colors = statusColors[status] || statusColors.OFFLINE;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colors.bg} bg-opacity-10 ${colors.text} ${sizeClasses[size]}`}>
      <span className={`w-2 h-2 rounded-full ${colors.bg}`} />
      {colors.label}
    </span>
  );
}

// ============================================================
// Health Bar Component
// ============================================================
export function HealthBar({ value, max = 20, label = 'Health' }) {
  const percentage = Math.min((value / max) * 100, 100);
  let color = 'bg-emerald-500';
  
  if (percentage < 25) {
    color = 'bg-red-500';
  } else if (percentage < 50) {
    color = 'bg-amber-500';
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Food Bar Component
// ============================================================
export function FoodBar({ value, max = 20 }) {
  const percentage = Math.min((value / max) * 100, 100);
  let color = 'bg-amber-500';
  
  if (percentage > 75) {
    color = 'bg-emerald-500';
  } else if (percentage < 25) {
    color = 'bg-red-500';
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Food</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Bot Card Component
// ============================================================
export function BotCard({ bot, onClick }) {
  const status = bot.liveStatus?.status || bot.status;
  
  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(bot)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{bot.name}</h3>
          <p className="text-sm text-slate-500">{bot.username}</p>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>
      
      <div className="space-y-2">
        <HealthBar 
          value={bot.liveStatus?.health || bot.health || 20} 
          max={20} 
        />
        <FoodBar 
          value={bot.liveStatus?.food || bot.food || 20} 
          max={20} 
        />
      </div>
      
      {bot.liveStatus?.serverConfig && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{bot.liveStatus.serverConfig.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Swarm Card Component
// ============================================================
export function SwarmCard({ swarm, onClick }) {
  const stats = swarm.stats || {};
  
  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(swarm)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{swarm.name}</h3>
          <p className="text-sm text-slate-500">{swarm.description || 'No description'}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{stats.totalBots || 0}</div>
          <div className="text-xs text-slate-500">bots</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-emerald-600">{stats.idleBots || 0}</div>
          <div className="text-xs text-emerald-600">Idle</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-amber-600">{stats.activeTasks || 0}</div>
          <div className="text-xs text-amber-600">Active</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-lg font-semibold text-slate-600">{stats.pendingTasks || 0}</div>
          <div className="text-xs text-slate-600">Pending</div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Load Balancing: {swarm.loadBalancing}</span>
          <span>Max: {swarm.maxConcurrent}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Task Card Component
// ============================================================
export function TaskCard({ task, onClick }) {
  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-900">{task.itemName}</h3>
          <p className="text-sm text-slate-500">x{task.itemCount}</p>
        </div>
        <StatusBadge status={task.status} size="sm" />
      </div>
      
      <div className="text-xs text-slate-500 space-y-1">
        <div>Target: {task.targetX}, {task.targetY}, {task.targetZ}</div>
        {task.targetPlayer && <div>Player: {task.targetPlayer}</div>}
        {task.assignedBotId && <div>Bot: {task.assignedBotId.slice(0, 8)}</div>}
        <div>Priority: {task.priority} | Retries: {task.retryCount}/{task.maxRetries}</div>
      </div>
      
      {task.errorMessage && (
        <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600">
          {task.errorMessage}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Stats Card Component
// ============================================================
export function StatsCard({ label, value, icon: Icon, color = 'slate' }) {
  const colorClasses = {
    slate: 'bg-slate-50 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className={`rounded-xl p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-6 h-6" />}
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm opacity-75">{label}</div>
        </div>
      </div>
    </div>
  );
}