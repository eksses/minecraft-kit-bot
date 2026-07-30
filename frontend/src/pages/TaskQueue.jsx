import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { StatusBadge } from '../components/ui/StatusComponents';
import { RefreshCw } from 'lucide-react';

const filters = ['ALL', 'PENDING', 'LOCKED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];

export default function TaskQueue() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const { addToast } = useToast();

  useEffect(() => { loadTasks(); }, []);

  useEffect(() => {
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      setTasks(await api.fleet.getTasks());
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load tasks' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (taskId) => {
    if (!confirm('Cancel this task?')) return;
    try {
      await api.fleet.cancelTask(taskId);
      loadTasks();
      addToast({ type: 'success', title: 'Task cancelled' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to cancel task' });
    }
  };

  const filteredTasks = filter === 'ALL' ? tasks : tasks.filter(t => t.status === filter);

  if (loading) {
    return <div className="p-12 text-center text-mdb-text-muted">Loading tasks...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Task Queue</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">Monitor and manage delivery tasks</p>
        </div>
        <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={loadTasks} aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -webkit-overflow-scrolling-touch [&::-webkit-scrollbar]:hidden">
        {filters.map((s) => (
          <button
            key={s}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 border text-[13px] font-medium whitespace-nowrap cursor-pointer transition-all ${filter === s ? 'bg-mdb-primary text-mdb-on-primary border-mdb-primary' : 'bg-mdb-surface border-mdb-surface-high text-mdb-text-secondary hover:border-mdb-text-muted'}`}
            onClick={() => setFilter(s)}
          >
            {s}
            {s !== 'ALL' && <span className="font-mono text-[11px] font-medium opacity-70">({tasks.filter(t => t.status === s).length})</span>}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
          <div className="text-lg font-semibold mb-2">No tasks</div>
          <div className="text-sm text-mdb-text-muted mb-4">No tasks match the current filter</div>
        </div>
      ) : (
        <div>
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-mdb-surface border border-mdb-surface-high p-4 mb-2">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="font-semibold text-sm">{task.type}</div>
                  <div className="text-[13px] text-mdb-text-muted">{new Date(task.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} />
                  {(task.status === 'PENDING' || task.status === 'LOCKED') && (
                    <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10" onClick={() => handleCancel(task.id)}>Cancel</button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {task.assignedBotId && <div className="flex justify-between text-[13px]"><span className="text-mdb-text-muted">Bot</span><span className="text-mdb-text">{task.assignedBotId}</span></div>}
                {task.swarmId && <div className="flex justify-between text-[13px]"><span className="text-mdb-text-muted">Swarm</span><span className="text-mdb-text">{task.swarmId}</span></div>}
                {task.details && <div className="flex justify-between text-[13px]"><span className="text-mdb-text-muted">Details</span><span className="text-mdb-text font-mono text-xs">{typeof task.details === 'string' ? task.details : JSON.stringify(task.details)}</span></div>}
                {task.errorMessage && <div className="flex justify-between text-[13px]"><span className="text-mdb-text-muted">Error</span><span className="text-mdb-status-error">{task.errorMessage}</span></div>}
                {task.retryCount > 0 && <div className="flex justify-between text-[13px]"><span className="text-mdb-text-muted">Retries</span><span className="text-mdb-text">{task.retryCount}</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
