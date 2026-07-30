import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { StatusBadge } from '../components/ui/StatusComponents';
import { RefreshCw, ListTodo, XCircle } from 'lucide-react';

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
        <button
          className="h-9 px-3 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:text-mdb-text hover:bg-mdb-surface-high transition-colors inline-flex items-center gap-2"
          onClick={loadTasks}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex gap-1.5 bg-mdb-surface rounded-xl p-1 border border-mdb-border mb-6 overflow-x-auto">
        {filters.map((s) => (
          <button
            key={s}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? 'bg-mdb-primary text-white'
                : 'text-mdb-text-muted hover:text-mdb-text hover:bg-mdb-surface-high'
            }`}
            onClick={() => setFilter(s)}
          >
            {s.replace('_', ' ')}
            {s !== 'ALL' && <span className="ml-1 opacity-70">({tasks.filter(t => t.status === s).length})</span>}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-mdb-text-muted">
          <ListTodo size={48} className="mb-4 opacity-30" />
          <div className="text-lg font-medium mb-1 text-mdb-text">No tasks</div>
          <div className="text-sm">No tasks match the current filter</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-mdb-surface rounded-xl border border-mdb-border p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-sm text-mdb-text">{task.type}</div>
                  <div className="text-xs text-mdb-text-muted mt-0.5">{new Date(task.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} />
                  {(task.status === 'PENDING' || task.status === 'LOCKED') && (
                    <button
                      className="h-7 px-2.5 rounded-lg border border-red-400/30 text-red-400 text-xs font-medium inline-flex items-center gap-1 hover:bg-red-400/10 transition-colors"
                      onClick={() => handleCancel(task.id)}
                    >
                      <XCircle size={12} /> Cancel
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {task.assignedBotId && (
                  <div className="flex justify-between">
                    <span className="text-mdb-text-muted">Bot</span>
                    <span className="text-mdb-text-secondary font-mono">{task.assignedBotId}</span>
                  </div>
                )}
                {task.swarmId && (
                  <div className="flex justify-between">
                    <span className="text-mdb-text-muted">Swarm</span>
                    <span className="text-mdb-text-secondary font-mono">{task.swarmId}</span>
                  </div>
                )}
                {task.details && (
                  <div className="col-span-2 flex justify-between">
                    <span className="text-mdb-text-muted">Details</span>
                    <span className="text-mdb-text-secondary font-mono truncate max-w-[60%] text-right">{typeof task.details === 'string' ? task.details : JSON.stringify(task.details)}</span>
                  </div>
                )}
                {task.errorMessage && (
                  <div className="col-span-2 flex justify-between">
                    <span className="text-mdb-text-muted">Error</span>
                    <span className="text-red-400 truncate max-w-[60%] text-right">{task.errorMessage}</span>
                  </div>
                )}
                {task.retryCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-mdb-text-muted">Retries</span>
                    <span className="text-mdb-text-secondary">{task.retryCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
