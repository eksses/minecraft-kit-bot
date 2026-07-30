import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { ListTodo, XCircle } from 'lucide-react';
import {
  Card, Button, Tabs, EmptyState, LoadingState, StatusBadge
} from '../components/ui';

const TAB_ITEMS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'LOCKED', label: 'Locked' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'FAILED', label: 'Failed' },
];

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
    try { setTasks(await api.fleet.getTasks()); }
    catch (err) { addToast({ type: 'error', title: 'Failed to load tasks' }); }
    finally { setLoading(false); }
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

  const tabsWithCounts = TAB_ITEMS.map(tab => ({
    ...tab,
    label: tab.id === 'ALL'
      ? `All (${tasks.length})`
      : `${tab.label.replace('_', ' ')} (${tasks.filter(t => t.status === tab.id).length})`
  }));

  if (loading) return <LoadingState text="Loading tasks..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Task Queue</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">Monitor and manage delivery tasks</p>
        </div>
        <Button variant="secondary" icon={<XCircle size={16} />} onClick={loadTasks} />
      </div>

      <Tabs items={tabsWithCounts} value={filter} onChange={setFilter} variant="pills" className="mb-6" />

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks"
          description="No tasks match the current filter"
        />
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card key={task.id}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-medium text-sm text-mdb-text">{task.type}</div>
                  <div className="text-xs text-mdb-text-muted mt-0.5">{new Date(task.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} />
                  {(task.status === 'PENDING' || task.status === 'LOCKED') && (
                    <Button variant="danger" size="sm" icon={<XCircle size={12} />} onClick={() => handleCancel(task.id)}>
                      Cancel
                    </Button>
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
                    <span className="text-mdb-text-secondary font-mono truncate max-w-[60%] text-right">
                      {typeof task.details === 'string' ? task.details : JSON.stringify(task.details)}
                    </span>
                  </div>
                )}
                {task.errorMessage && (
                  <div className="col-span-2 flex justify-between">
                    <span className="text-mdb-text-muted">Error</span>
                    <span className="text-mdb-error truncate max-w-[60%] text-right">{task.errorMessage}</span>
                  </div>
                )}
                {task.retryCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-mdb-text-muted">Retries</span>
                    <span className="text-mdb-text-secondary">{task.retryCount}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
