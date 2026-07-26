import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { StatusBadge, HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { RefreshCw, Plus, Play, Square, Scan, Send, Layers, Bot, Activity, Package, MapPin, Globe, Trash2, Settings, ChevronRight } from 'lucide-react';

export default function SwarmController() {
  const [swarms, setSwarms] = useState([]);
  const [selectedSwarm, setSelectedSwarm] = useState(null);
  const [bots, setBots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [broadcastCmd, setBroadcastCmd] = useState('');
  const [form, setForm] = useState({ name: '', loadBalancing: 'NEAREST' });
  const { addToast } = useToast();
  const navigate = useNavigate();
  const refreshRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedSwarm) {
      loadSwarmData();
      refreshRef.current = setInterval(loadSwarmData, 3000);
    }
    return () => clearInterval(refreshRef.current);
  }, [selectedSwarm]);

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

  const loadSwarmData = async () => {
    if (!selectedSwarm) return;
    try {
      const [swarmBots, swarmTasks] = await Promise.all([
        api.fleet.getSwarmBots(selectedSwarm.id),
        api.fleet.getSwarmTasks(selectedSwarm.id),
      ]);
      setBots(prev => {
        const swarmBotIds = new Set(swarmBots.map(b => b.id));
        const updated = prev.map(b => swarmBotIds.has(b.id) ? { ...b, ...swarmBots.find(sb => sb.id === b.id) } : b);
        const newBots = swarmBots.filter(b => !prev.find(p => p.id === b.id));
        return [...updated, ...newBots];
      });
      setTasks(prev => {
        const swarmTaskIds = new Set(swarmTasks.map(t => t.id));
        const updated = prev.map(t => swarmTaskIds.has(t.id) ? { ...t, ...swarmTasks.find(st => st.id === t.id) } : t);
        const newTasks = swarmTasks.filter(t => !prev.find(p => p.id === t.id));
        return [...updated, ...newTasks];
      });
    } catch (err) {
      console.error('Failed to load swarm data:', err);
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

  const handleAddBot = async (botId) => {
    try {
      await api.fleet.addBotToSwarm(selectedSwarm.id, botId);
      loadSwarmData();
      addToast({ type: 'success', title: 'Bot added to swarm' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add bot' });
    }
  };

  const handleRemoveBot = async (botId) => {
    try {
      await api.fleet.removeBotFromSwarm(selectedSwarm.id, botId);
      loadSwarmData();
      addToast({ type: 'success', title: 'Bot removed from swarm' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to remove bot' });
    }
  };

  const handleStartBot = async (botId) => {
    try { await api.fleet.startBot(botId); loadSwarmData(); addToast({ type: 'success', title: 'Bot started' }); }
    catch (err) { addToast({ type: 'error', title: 'Failed to start bot' }); }
  };

  const handleStopBot = async (botId) => {
    try { await api.fleet.stopBot(botId); loadSwarmData(); addToast({ type: 'success', title: 'Bot stopped' }); }
    catch (err) { addToast({ type: 'error', title: 'Failed to stop bot' }); }
  };

  const handleStartAll = async () => {
    const offline = getSwarmBots(selectedSwarm.id).filter(b => (b.liveStatus?.status || b.status) === 'OFFLINE');
    for (const bot of offline) {
      try { await api.fleet.startBot(bot.id); } catch {}
    }
    addToast({ type: 'success', title: `Starting ${offline.length} bots` });
    setTimeout(loadSwarmData, 2000);
  };

  const handleStopAll = async () => {
    const online = getSwarmBots(selectedSwarm.id).filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    for (const bot of online) {
      try { await api.fleet.stopBot(bot.id); } catch {}
    }
    addToast({ type: 'success', title: `Stopping ${online.length} bots` });
    setTimeout(loadSwarmData, 2000);
  };

  const handleScanAll = async () => {
    const online = getSwarmBots(selectedSwarm.id).filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    for (const bot of online) {
      try { await api.chests.triggerScan(bot.id, 32); } catch {}
    }
    addToast({ type: 'success', title: `Scanning with ${online.length} bots` });
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastCmd.trim()) return;
    const online = getSwarmBots(selectedSwarm.id).filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    for (const bot of online) {
      try { await api.fleet.sendBotCommand(bot.id, broadcastCmd); } catch {}
    }
    addToast({ type: 'success', title: `Command sent to ${online.length} bots` });
    setBroadcastCmd('');
  };

  const getSwarmBots = (id) => bots.filter(b => b.swarmId === id);
  const getSwarmTasks = (id) => tasks.filter(t => t.swarmId === id);

  const getSwarmStats = (swarmId) => {
    const swarmBots = getSwarmBots(swarmId);
    const swarmTasks = getSwarmTasks(swarmId);
    const onlineBots = swarmBots.filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    const totalHealth = swarmBots.reduce((sum, b) => sum + (b.liveStatus?.health || 0), 0);
    const totalFood = swarmBots.reduce((sum, b) => sum + (b.liveStatus?.food || 0), 0);
    return {
      totalBots: swarmBots.length,
      onlineBots: onlineBots.length,
      offlineBots: swarmBots.length - onlineBots.length,
      avgHealth: swarmBots.length > 0 ? Math.round(totalHealth / swarmBots.length) : 0,
      avgFood: swarmBots.length > 0 ? Math.round(totalFood / swarmBots.length) : 0,
      activeTasks: swarmTasks.filter(t => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length,
      completedTasks: swarmTasks.filter(t => t.status === 'COMPLETED').length,
      failedTasks: swarmTasks.filter(t => t.status === 'FAILED').length,
    };
  };

  const getDimension = (bot) => {
    if (!bot.liveStatus?.position) return 'Unknown';
    const y = bot.liveStatus.position.y;
    if (y > 320) return 'End';
    if (y < -64) return 'Nether';
    return 'Overworld';
  };

  if (loading) return <div className="loading-state">Loading swarms...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Swarm Controller</h1>
          <p className="page-subtitle">{swarms.length} swarms &middot; {bots.length} total bots</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost btn-sm" onClick={loadData} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Swarm
          </button>
        </div>
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
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Delivery Swarm" />
                </div>
                <div className="form-group">
                  <label className="form-label">Load Balancing</label>
                  <select value={form.loadBalancing} onChange={(e) => setForm({...form, loadBalancing: e.target.value})}>
                    <option value="NEAREST">Nearest Bot</option>
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
            swarms.map((swarm) => {
              const stats = getSwarmStats(swarm.id);
              return (
                <div
                  key={swarm.id}
                  className={`swarm-card ${selectedSwarm?.id === swarm.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSwarm(swarm)}
                >
                  <div className="swarm-card-header">
                    <span className="swarm-card-name">{swarm.name}</span>
                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteSwarm(swarm.id); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="swarm-card-meta">
                    <span className="text-success">{stats.onlineBots} online</span>
                    <span className="separator">/</span>
                    <span>{stats.totalBots} bots</span>
                    <span className="separator">/</span>
                    <span>{stats.activeTasks} tasks</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div>
          {selectedSwarm ? (
            <div>
              <div className="flex items-center justify-between mb-md">
                <h2 className="section-heading mb-0">{selectedSwarm.name}</h2>
                <div className="flex gap-sm">
                  <button className="btn btn-success btn-sm" onClick={handleStartAll}>
                    <Play size={14} /> Start All
                  </button>
                  <button className="btn btn-warning btn-sm" onClick={handleStopAll}>
                    <Square size={14} /> Stop All
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleScanAll}>
                    <Scan size={14} /> Scan All
                  </button>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{getSwarmStats(selectedSwarm.id).onlineBots}<span className="text-muted">/{getSwarmStats(selectedSwarm.id).totalBots}</span></div>
                  <div className="stat-label"><Bot size={14} /> Online</div>
                </div>
                <div className="stat-card stat-warning">
                  <div className="stat-value">{getSwarmStats(selectedSwarm.id).activeTasks}</div>
                  <div className="stat-label"><Activity size={14} /> Active Tasks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{getSwarmStats(selectedSwarm.id).avgHealth}</div>
                  <div className="stat-label">Avg HP</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{getSwarmStats(selectedSwarm.id).avgFood}</div>
                  <div className="stat-label">Avg Food</div>
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                  <span>Bot Fleet</span>
                  <select id="add-bot-select" className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onChange={(e) => {
                    if (e.target.value) { handleAddBot(e.target.value); e.target.value = ''; }
                  }}>
                    <option value="">+ Add Bot</option>
                    {bots.filter(b => !b.swarmId).map(bot => (
                      <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                  </select>
                </div>

                {getSwarmBots(selectedSwarm.id).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-title">No bots in swarm</div>
                    <div className="empty-state-text">Add bots to start controlling them together</div>
                  </div>
                ) : (
                  <div className="bot-grid">
                    {getSwarmBots(selectedSwarm.id).map((bot) => {
                      const status = bot.liveStatus?.status || bot.status;
                      const isOnline = status === 'ONLINE';
                      return (
                        <div key={bot.id} className="swarm-bot-card">
                          <div className="swarm-bot-card-header">
                            <div className="flex items-center gap-sm">
                              <StatusBadge status={status} />
                              <span className="swarm-bot-name">{bot.name}</span>
                            </div>
                            <div className="flex gap-xs">
                              {isOnline ? (
                                <button className="btn btn-warning btn-xs" onClick={() => handleStopBot(bot.id)}>
                                  <Square size={12} />
                                </button>
                              ) : (
                                <button className="btn btn-success btn-xs" onClick={() => handleStartBot(bot.id)}>
                                  <Play size={12} />
                                </button>
                              )}
                              <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/fleet/bots/${bot.id}`)}>
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="swarm-bot-card-body">
                            <div className="swarm-bot-info-row">
                              <span className="swarm-bot-label">User</span>
                              <span className="mono-sm">{bot.username}</span>
                            </div>

                            {isOnline && (
                              <>
                                <div className="swarm-bot-info-row">
                                  <span className="swarm-bot-label">HP</span>
                                  <HealthBar value={bot.liveStatus?.health || 0} />
                                </div>
                                <div className="swarm-bot-info-row">
                                  <span className="swarm-bot-label">Food</span>
                                  <FoodBar value={bot.liveStatus?.food || 0} />
                                </div>
                                <div className="swarm-bot-info-row">
                                  <span className="swarm-bot-label">Pos</span>
                                  <span className="mono-sm text-xs">
                                    {bot.liveStatus?.position
                                      ? `${Math.round(bot.liveStatus.position.x)}, ${Math.round(bot.liveStatus.position.y)}, ${Math.round(bot.liveStatus.position.z)}`
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div className="swarm-bot-info-row">
                                  <span className="swarm-bot-label">Dim</span>
                                  <span className="text-xs">{getDimension(bot)}</span>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="swarm-bot-card-footer">
                            <button className="btn btn-ghost btn-xs" onClick={() => handleRemoveBot(bot.id)}>
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="section">
                <div className="section-header">Broadcast Command</div>
                <form onSubmit={handleBroadcast} className="flex gap-sm">
                  <input
                    type="text"
                    value={broadcastCmd}
                    onChange={(e) => setBroadcastCmd(e.target.value)}
                    placeholder="/say Hello swarm!"
                    className="command-input flex-1"
                  />
                  <button type="submit" className="btn btn-primary">
                    <Send size={16} /> Send to All
                  </button>
                </form>
              </div>

              <div className="section">
                <div className="section-header">
                  <span>Tasks ({getSwarmStats(selectedSwarm.id).activeTasks} active)</span>
                </div>
                {getSwarmTasks(selectedSwarm.id).length === 0 ? (
                  <div className="text-muted text-sm">No tasks</div>
                ) : (
                  getSwarmTasks(selectedSwarm.id).slice(0, 10).map((task) => (
                    <div key={task.id} className="list-item">
                      <div>
                        <div className="list-item-name">{task.type || task.itemName}</div>
                        <div className="list-item-meta">{task.assignedBot?.name || 'Auto-assigned'}</div>
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
              <div className="empty-state-text">Choose a swarm from the list to open the controller</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
