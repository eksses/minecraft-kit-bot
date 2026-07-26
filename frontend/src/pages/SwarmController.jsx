import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { StatusBadge } from '../components/ui/StatusComponents';

export default function SwarmController() {
  const [swarms, setSwarms] = useState([]);
  const [selectedSwarm, setSelectedSwarm] = useState(null);
  const [bots, setBots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', loadBalancing: 'NEAREST' });
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [swarmsData, botsData, tasksData] = await Promise.all([
        api.fleet.getSwarms(), api.fleet.getBots(), api.fleet.getTasks(),
      ]);
      setSwarms(swarmsData);
      setBots(botsData);
      setTasks(tasksData);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSwarm = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createSwarm(form);
      setShowCreate(false);
      setForm({ name: '', loadBalancing: 'NEAREST' });
      loadData();
      addToast({ type: 'success', title: 'Swarm created' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create swarm' });
    }
  };

  const handleDeleteSwarm = async (id) => {
    if (!confirm('Delete this swarm?')) return;
    try {
      await api.fleet.deleteSwarm(id);
      setSelectedSwarm(null);
      loadData();
      addToast({ type: 'success', title: 'Swarm deleted' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete swarm' });
    }
  };

  const handleAddBot = async (swarmId, botId) => {
    try {
      await api.fleet.addBotToSwarm(swarmId, botId);
      loadData();
      addToast({ type: 'success', title: 'Bot added to swarm' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add bot' });
    }
  };

  const handleRemoveBot = async (swarmId, botId) => {
    try {
      await api.fleet.removeBotFromSwarm(swarmId, botId);
      loadData();
      addToast({ type: 'success', title: 'Bot removed from swarm' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to remove bot' });
    }
  };

  const getSwarmBots = (id) => bots.filter(b => b.swarmId === id);
  const getSwarmTasks = (id) => tasks.filter(t => t.swarmId === id);

  if (loading) {
    return <div className="loading-state">Loading swarms...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Swarms</h1>
          <p className="page-subtitle">Manage bot groups and task distribution</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Swarm</button>
      </div>

      {showCreate && (
        <div className="drawer-overlay" onClick={() => setShowCreate(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Create New Swarm</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>X</button>
            </div>
            <div className="drawer-body">
              <form onSubmit={handleCreateSwarm}>
                <div className="form-group">
                  <label className="form-label">Swarm Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="My Swarm" />
                </div>
                <div className="form-group">
                  <label className="form-label">Load Balancing</label>
                  <select value={form.loadBalancing} onChange={(e) => setForm({...form, loadBalancing: e.target.value})}>
                    <option value="NEAREST">Nearest</option>
                    <option value="LEAST_BUSY">Least Busy</option>
                    <option value="ROUND_ROBIN">Round Robin</option>
                  </select>
                </div>
                <div className="flex gap-sm mt-md">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2col">
        <div>
          <h2 className="section-heading">Swarms</h2>
          {swarms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No swarms yet</div>
              <div className="empty-state-text">Create a swarm to group your bots</div>
            </div>
          ) : (
            swarms.map((swarm) => (
              <div
                key={swarm.id}
                className={`swarm-card ${selectedSwarm?.id === swarm.id ? 'selected' : ''}`}
                onClick={() => setSelectedSwarm(swarm)}
              >
                <div className="swarm-card-header">
                  <span className="swarm-card-name">{swarm.name}</span>
                  <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteSwarm(swarm.id); }}>Delete</button>
                </div>
                <div className="swarm-card-meta">
                  {swarm.loadBalancing} &middot; {getSwarmBots(swarm.id).length} bots &middot; {getSwarmTasks(swarm.id).length} tasks
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          {selectedSwarm ? (
            <div>
              <h2 className="section-heading">{selectedSwarm.name}</h2>

              <div className="section">
                <div className="section-header">Assigned Bots</div>
                {getSwarmBots(selectedSwarm.id).length === 0 ? (
                  <div className="swarm-detail-text">No bots assigned</div>
                ) : (
                  getSwarmBots(selectedSwarm.id).map((bot) => (
                    <div key={bot.id} className="list-item">
                      <div>
                        <div className="list-item-name">{bot.name}</div>
                        <div className="list-item-meta">{bot.username}</div>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRemoveBot(selectedSwarm.id, bot.id)}>Remove</button>
                    </div>
                  ))
                )}
                <div className="mt-md flex gap-sm">
                  <select id="add-bot-select" className="flex-1">
                    <option value="">Select a bot...</option>
                    {bots.filter(b => !getSwarmBots(selectedSwarm.id).find(sb => sb.id === b.id)).map(bot => (
                      <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={() => {
                    const sel = document.getElementById('add-bot-select');
                    if (sel.value) { handleAddBot(selectedSwarm.id, sel.value); sel.value = ''; }
                  }}>Add</button>
                </div>
              </div>

              <div className="section">
                <div className="section-header">Tasks</div>
                {getSwarmTasks(selectedSwarm.id).length === 0 ? (
                  <div className="swarm-detail-text">No active tasks</div>
                ) : (
                  getSwarmTasks(selectedSwarm.id).map((task) => (
                    <div key={task.id} className="list-item">
                      <div>
                        <div className="list-item-name">{task.type}</div>
                        <div className="list-item-meta">{task.assignedBot?.name || 'Auto'}</div>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">Select a swarm</div>
              <div className="empty-state-text">Choose a swarm from the list to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
