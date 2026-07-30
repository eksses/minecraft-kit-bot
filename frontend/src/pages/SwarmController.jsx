import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { useRealtime } from '../hooks/useRealtime';
import { StatusBadge, HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { RefreshCw, Plus, Play, Square, Scan, Send, Trash2, ChevronRight, X, Bot, Activity, Zap } from 'lucide-react';

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

  useEffect(() => { loadData(); }, []);

  const swarmIds = selectedSwarm ? [selectedSwarm.id] : [];
  const rt = useRealtime([], swarmIds);

  useEffect(() => {
    if (!rt?.on || !selectedSwarm) return;
    const unsubs = [
      rt.on('swarm_update', () => loadSwarmData()),
      rt.on('bot_status', () => loadSwarmData()),
      rt.on('task_update', () => loadSwarmData()),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [rt, selectedSwarm?.id]);

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
      try { await api.fleet.sendCommand(bot.id, broadcastCmd); } catch {}
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

  if (loading) return <div className="p-12 text-center text-mdb-text-muted">Loading swarms...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Swarm Controller</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">{swarms.length} swarms · {bots.length} total bots</p>
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-3 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:text-mdb-text hover:bg-mdb-surface-high transition-colors inline-flex items-center gap-2" onClick={loadData}>
            <RefreshCw size={16} />
          </button>
          <button className="h-9 px-4 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium inline-flex items-center gap-2 transition-colors" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Swarm
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-end animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-border flex flex-col overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-mdb-border">
              <h2 className="text-lg font-semibold">Create New Swarm</h2>
              <button className="h-8 w-8 rounded-lg hover:bg-mdb-surface-high flex items-center justify-center text-mdb-text-muted hover:text-mdb-text transition-colors" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleCreateSwarm} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Swarm Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Delivery Swarm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Load Balancing</label>
                  <select value={form.loadBalancing} onChange={(e) => setForm({...form, loadBalancing: e.target.value})}>
                    <option value="NEAREST">Nearest Bot</option>
                    <option value="LEAST_BUSY">Least Busy</option>
                    <option value="ROUND_ROBIN">Round Robin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4 border-t border-mdb-border">
                  <button type="button" className="flex-1 h-10 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:bg-mdb-surface-high transition-colors" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="flex-1 h-10 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium transition-colors">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold mb-3 text-mdb-text-secondary uppercase tracking-wider">Swarms</h2>
          {swarms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-mdb-text-muted">
              <div className="text-base font-medium mb-1 text-mdb-text">No swarms yet</div>
              <div className="text-sm">Create a swarm to group your bots</div>
            </div>
          ) : (
            swarms.map((swarm) => {
              const stats = getSwarmStats(swarm.id);
              return (
                <div
                  key={swarm.id}
                  className={`bg-mdb-surface rounded-xl border p-4 mb-3 cursor-pointer transition-colors hover:border-mdb-primary/50 ${
                    selectedSwarm?.id === swarm.id ? 'border-mdb-primary' : 'border-mdb-border'
                  }`}
                  onClick={() => setSelectedSwarm(swarm)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{swarm.name}</span>
                    <button className="h-7 w-7 rounded-lg border border-mdb-border text-mdb-text-muted hover:text-red-400 hover:border-red-400/30 flex items-center justify-center transition-colors" onClick={(e) => { e.stopPropagation(); handleDeleteSwarm(swarm.id); }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-4 text-xs text-mdb-text-muted">
                    <span><span className="text-emerald-400 font-medium">{stats.onlineBots}</span> online</span>
                    <span>{stats.totalBots} bots</span>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-mdb-text-secondary uppercase tracking-wider">{selectedSwarm.name}</h2>
                <div className="flex gap-2">
                  <button className="h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors" onClick={handleStartAll}>
                    <Play size={12} /> Start All
                  </button>
                  <button className="h-8 px-3 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-red-500/20 transition-colors" onClick={handleStopAll}>
                    <Square size={12} /> Stop All
                  </button>
                  <button className="h-8 px-3 rounded-lg border border-mdb-border text-xs font-medium text-mdb-text-secondary hover:bg-mdb-surface-high transition-colors inline-flex items-center gap-1.5" onClick={handleScanAll}>
                    <Scan size={12} /> Scan All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Online', value: getSwarmStats(selectedSwarm.id).onlineBots, sub: `/${getSwarmStats(selectedSwarm.id).totalBots}`, icon: Bot, color: 'text-emerald-400' },
                  { label: 'Active Tasks', value: getSwarmStats(selectedSwarm.id).activeTasks, icon: Activity, color: 'text-amber-400' },
                  { label: 'Avg HP', value: getSwarmStats(selectedSwarm.id).avgHealth, icon: null, color: 'text-mdb-text' },
                  { label: 'Avg Food', value: getSwarmStats(selectedSwarm.id).avgFood, icon: null, color: 'text-mdb-text' },
                ].map((stat, i) => (
                  <div key={i} className="bg-mdb-surface rounded-xl border border-mdb-border p-4">
                    <div className="text-2xl font-bold tracking-tight">
                      <span className={stat.color}>{stat.value}</span>
                      {stat.sub && <span className="text-mdb-text-muted text-lg">{stat.sub}</span>}
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1 flex items-center gap-1">
                      {stat.icon && <stat.icon size={12} />}
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-mdb-surface rounded-xl border border-mdb-border p-5 mb-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-mdb-border">
                  <span className="text-sm font-medium">Bot Fleet</span>
                  <select
                    className="h-8 px-3 rounded-lg bg-mdb-surface-high border border-mdb-border text-xs font-medium text-mdb-text-secondary w-auto"
                    onChange={(e) => {
                      if (e.target.value) { handleAddBot(e.target.value); e.target.value = ''; }
                    }}
                  >
                    <option value="">+ Add Bot</option>
                    {bots.filter(b => !b.swarmId).map(bot => (
                      <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                  </select>
                </div>

                {getSwarmBots(selectedSwarm.id).length === 0 ? (
                  <div className="py-12 text-center text-mdb-text-muted">
                    <div className="text-sm">No bots in swarm</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getSwarmBots(selectedSwarm.id).map((bot) => {
                      const status = bot.liveStatus?.status || bot.status;
                      const isOnline = status === 'ONLINE';
                      return (
                        <div key={bot.id} className="bg-mdb-bg rounded-lg border border-mdb-border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={status} />
                              <span className="text-sm font-medium">{bot.name}</span>
                            </div>
                            <div className="flex gap-1">
                              {isOnline ? (
                                <button className="h-7 w-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors" onClick={() => handleStopBot(bot.id)}>
                                  <Square size={12} />
                                </button>
                              ) : (
                                <button className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors" onClick={() => handleStartBot(bot.id)}>
                                  <Play size={12} />
                                </button>
                              )}
                              <button className="h-7 w-7 rounded-lg border border-mdb-border text-mdb-text-muted flex items-center justify-center hover:text-mdb-primary hover:border-mdb-primary/30 transition-colors" onClick={() => navigate(`/fleet/bots/${bot.id}`)}>
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-mdb-text-muted font-mono mb-1">{bot.username}</div>
                          {isOnline && (
                            <div className="space-y-1.5 mt-2">
                              <HealthBar value={bot.liveStatus?.health || 0} />
                              <FoodBar value={bot.liveStatus?.food || 0} />
                              <div className="flex items-center gap-2 text-xs text-mdb-text-muted">
                                <span>{bot.liveStatus?.position ? `${Math.round(bot.liveStatus.position.x)}, ${Math.round(bot.liveStatus.position.y)}, ${Math.round(bot.liveStatus.position.z)}` : 'N/A'}</span>
                                <span>·</span>
                                <span>{getDimension(bot)}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-end mt-2 pt-2 border-t border-mdb-border">
                            <button className="text-xs text-mdb-text-muted hover:text-red-400 transition-colors inline-flex items-center gap-1" onClick={() => handleRemoveBot(bot.id)}>
                              <Trash2 size={10} /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-mdb-surface rounded-xl border border-mdb-border p-5 mb-6">
                <h3 className="text-sm font-medium mb-3">Broadcast Command</h3>
                <form onSubmit={handleBroadcast} className="flex gap-2">
                  <input
                    type="text"
                    value={broadcastCmd}
                    onChange={(e) => setBroadcastCmd(e.target.value)}
                    placeholder="/say Hello swarm!"
                    className="flex-1 font-mono text-sm"
                  />
                  <button type="submit" className="h-10 px-4 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium inline-flex items-center gap-2 transition-colors">
                    <Send size={14} /> Send
                  </button>
                </form>
              </div>

              <div className="bg-mdb-surface rounded-xl border border-mdb-border p-5">
                <h3 className="text-sm font-medium mb-3">Tasks ({getSwarmStats(selectedSwarm.id).activeTasks} active)</h3>
                {getSwarmTasks(selectedSwarm.id).length === 0 ? (
                  <div className="py-8 text-center text-mdb-text-muted text-sm">No tasks</div>
                ) : (
                  <div className="space-y-2">
                    {getSwarmTasks(selectedSwarm.id).slice(0, 10).map((task) => (
                      <div key={task.id} className="flex items-center justify-between py-2 px-3 bg-mdb-bg rounded-lg border border-mdb-border">
                        <div>
                          <div className="text-sm font-medium">{task.type || task.itemName}</div>
                          <div className="text-xs text-mdb-text-muted">{task.assignedBot?.name || 'Auto-assigned'}</div>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-mdb-text-muted">
              <div className="text-lg font-medium mb-1 text-mdb-text">Select a swarm</div>
              <div className="text-sm">Choose a swarm from the list to open the controller</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
