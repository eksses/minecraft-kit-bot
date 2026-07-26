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
    return <div className="loading-state">Loading tasks...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Queue</h1>
          <p className="page-subtitle">Monitor and manage delivery tasks</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadTasks} aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="filter-chips">
        {filters.map((s) => (
          <button
            key={s}
            className={`filter-chip ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
            {s !== 'ALL' && <span className="filter-chip-count">({tasks.filter(t => t.status === s).length})</span>}
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No tasks</div>
          <div className="empty-state-text">No tasks match the current filter</div>
        </div>
      ) : (
        <div>
          {filteredTasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-header">
                <div>
                  <div className="task-type">{task.type}</div>
                  <div className="task-meta">{new Date(task.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-sm">
                  <StatusBadge status={task.status} />
                  {(task.status === 'PENDING' || task.status === 'LOCKED') && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleCancel(task.id)}>Cancel</button>
                  )}
                </div>
              </div>
              <div className="task-details">
                {task.assignedBotId && <div className="detail"><span className="detail-label">Bot</span><span className="detail-value">{task.assignedBotId}</span></div>}
                {task.swarmId && <div className="detail"><span className="detail-label">Swarm</span><span className="detail-value">{task.swarmId}</span></div>}
                {task.details && <div className="detail"><span className="detail-label">Details</span><span className="detail-value mono-sm">{typeof task.details === 'string' ? task.details : JSON.stringify(task.details)}</span></div>}
                {task.errorMessage && <div className="detail"><span className="detail-label">Error</span><span className="detail-value text-danger">{task.errorMessage}</span></div>}
                {task.retryCount > 0 && <div className="detail"><span className="detail-label">Retries</span><span className="detail-value">{task.retryCount}</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
