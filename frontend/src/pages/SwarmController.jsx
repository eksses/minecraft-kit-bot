import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { useRealtime } from '../hooks/useRealtime';
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
          <p className="text-sm text-mdb-text-muted mt-0.5">{swarms.length} swarms &middot; {bots.length} total bots</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={loadData} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Swarm
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-stretch justify-end" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-surface-high flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-mdb-surface-high">
              <span className="text-lg font-bold">Create New Swarm</span>
              <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => setShowCreate(false)}>X</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleCreateSwarm}>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Swarm Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Delivery Swarm" />
                </div>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Load Balancing</label>
                  <select value={form.loadBalancing} onChange={(e) => setForm({...form, loadBalancing: e.target.value})}>
                    <option value="NEAREST">Nearest Bot</option>
                    <option value="LEAST_BUSY">Least Busy</option>
                    <option value="ROUND_ROBIN">Round Robin</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold mb-4">Swarms</h2>
          {swarms.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
              <div className="text-base font-semibold mb-2">No swarms yet</div>
              <div className="text-sm mb-4">Create a swarm to group your bots</div>
            </div>
          ) : (
            swarms.map((swarm) => {
              const stats = getSwarmStats(swarm.id);
              return (
                <div
                  key={swarm.id}
                  className={`bg-mdb-surface border p-6 mb-4 cursor-pointer transition-[border-color] hover:border-mdb-primary ${selectedSwarm?.id === swarm.id ? 'border-2 border-mdb-primary' : 'border-mdb-surface-high'}`}
                  onClick={() => setSelectedSwarm(swarm)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base font-semibold">{swarm.name}</span>
                    <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10" onClick={(e) => { e.stopPropagation(); handleDeleteSwarm(swarm.id); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-[13px] text-mdb-text-muted">
                    <span className="text-mdb-online">{stats.onlineBots} online</span>
                    <span className="mx-1 text-mdb-outline-variant">/</span>
                    <span>{stats.totalBots} bots</span>
                    <span className="mx-1 text-mdb-outline-variant">/</span>
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
                <h2 className="text-base font-semibold mb-0">{selectedSwarm.name}</h2>
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-online text-mdb-surface-lowest" onClick={handleStartAll}>
                    <Play size={14} /> Start All
                  </button>
                  <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-working text-mdb-surface-lowest" onClick={handleStopAll}>
                    <Square size={14} /> Stop All
                  </button>
                  <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={handleScanAll}>
                    <Scan size={14} /> Scan All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-mdb-surface border border-mdb-surface-high p-6">
                  <div className="text-[28px] font-bold leading-tight tracking-tight">{getSwarmStats(selectedSwarm.id).onlineBots}<span className="text-mdb-text-muted">/{getSwarmStats(selectedSwarm.id).totalBots}</span></div>
                  <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1"><Bot size={14} className="inline" /> Online</div>
                </div>
                <div className="bg-mdb-surface border border-mdb-surface-high p-6">
                  <div className="text-[28px] font-bold leading-tight tracking-tight text-mdb-working">{getSwarmStats(selectedSwarm.id).activeTasks}</div>
                  <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1"><Activity size={14} className="inline" /> Active Tasks</div>
                </div>
                <div className="bg-mdb-surface border border-mdb-surface-high p-6">
                  <div className="text-[28px] font-bold leading-tight tracking-tight">{getSwarmStats(selectedSwarm.id).avgHealth}</div>
                  <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1">Avg HP</div>
                </div>
                <div className="bg-mdb-surface border border-mdb-surface-high p-6">
                  <div className="text-[28px] font-bold leading-tight tracking-tight">{getSwarmStats(selectedSwarm.id).avgFood}</div>
                  <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1">Avg Food</div>
                </div>
              </div>

              <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
                <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant flex items-center justify-between">
                  <span>Bot Fleet</span>
                  <select id="add-bot-select" className="h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary bg-mdb-surface-high border border-mdb-surface-high w-auto" onChange={(e) => {
                    if (e.target.value) { handleAddBot(e.target.value); e.target.value = ''; }
                  }}>
                    <option value="">+ Add Bot</option>
                    {bots.filter(b => !b.swarmId).map(bot => (
                      <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                  </select>
                </div>

                {getSwarmBots(selectedSwarm.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
                    <div className="text-base font-semibold mb-2">No bots in swarm</div>
                    <div className="text-sm mb-4">Add bots to start controlling them together</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-md:!grid-cols-1">
                    {getSwarmBots(selectedSwarm.id).map((bot) => {
                      const status = bot.liveStatus?.status || bot.status;
                      const isOnline = status === 'ONLINE';
                      return (
                        <div key={bot.id} className="bg-mdb-surface border border-mdb-outline-variant flex flex-col">
                          <div className="flex items-center justify-between py-2 px-4 border-b border-mdb-outline-variant">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={status} />
                              <span className="font-bold text-sm">{bot.name}</span>
                            </div>
                            <div className="flex gap-1">
                              {isOnline ? (
                                <button className="inline-flex items-center justify-center p-1 min-h-7 min-w-7 text-xs font-bold bg-mdb-working text-mdb-surface-lowest" onClick={() => handleStopBot(bot.id)}>
                                  <Square size={12} />
                                </button>
                              ) : (
                                <button className="inline-flex items-center justify-center p-1 min-h-7 min-w-7 text-xs font-bold bg-mdb-online text-mdb-surface-lowest" onClick={() => handleStartBot(bot.id)}>
                                  <Play size={12} />
                                </button>
                              )}
                              <button className="inline-flex items-center justify-center p-1 min-h-7 min-w-7 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => navigate(`/fleet/bots/${bot.id}`)}>
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="py-2 px-4 flex-1">
                            <div className="flex items-center justify-between py-0.5 gap-2">
                              <span className="font-mono text-[11px] text-mdb-text-muted uppercase tracking-wider min-w-[32px]">User</span>
                              <span className="font-mono text-xs text-mdb-text-muted">{bot.username}</span>
                            </div>

                            {isOnline && (
                              <>
                                <div className="flex items-center justify-between py-0.5 gap-2">
                                  <span className="font-mono text-[11px] text-mdb-text-muted uppercase tracking-wider min-w-[32px]">HP</span>
                                  <HealthBar value={bot.liveStatus?.health || 0} />
                                </div>
                                <div className="flex items-center justify-between py-0.5 gap-2">
                                  <span className="font-mono text-[11px] text-mdb-text-muted uppercase tracking-wider min-w-[32px]">Food</span>
                                  <FoodBar value={bot.liveStatus?.food || 0} />
                                </div>
                                <div className="flex items-center justify-between py-0.5 gap-2">
                                  <span className="font-mono text-[11px] text-mdb-text-muted uppercase tracking-wider min-w-[32px]">Pos</span>
                                  <span className="font-mono text-xs text-[12px]">
                                    {bot.liveStatus?.position
                                      ? `${Math.round(bot.liveStatus.position.x)}, ${Math.round(bot.liveStatus.position.y)}, ${Math.round(bot.liveStatus.position.z)}`
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between py-0.5 gap-2">
                                  <span className="font-mono text-[11px] text-mdb-text-muted uppercase tracking-wider min-w-[32px]">Dim</span>
                                  <span className="text-[12px]">{getDimension(bot)}</span>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="py-1 px-4 border-t border-mdb-outline-variant flex justify-end">
                            <button className="inline-flex items-center gap-1 p-1 min-h-7 min-w-7 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => handleRemoveBot(bot.id)}>
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
                <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">Broadcast Command</div>
                <form onSubmit={handleBroadcast} className="flex gap-2">
                  <input
                    type="text"
                    value={broadcastCmd}
                    onChange={(e) => setBroadcastCmd(e.target.value)}
                    placeholder="/say Hello swarm!"
                    className="flex-1 font-mono text-[13px]"
                  />
                  <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary">
                    <Send size={16} /> Send to All
                  </button>
                </form>
              </div>

              <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
                <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">
                  <span>Tasks ({getSwarmStats(selectedSwarm.id).activeTasks} active)</span>
                </div>
                {getSwarmTasks(selectedSwarm.id).length === 0 ? (
                  <div className="text-mdb-text-muted text-sm">No tasks</div>
                ) : (
                  getSwarmTasks(selectedSwarm.id).slice(0, 10).map((task) => (
                    <div key={task.id} className="flex items-center justify-between px-4 h-12 border-b border-mdb-outline-variant">
                      <div>
                        <div className="font-semibold">{task.type || task.itemName}</div>
                        <div className="text-[13px] text-mdb-text-muted">{task.assignedBot?.name || 'Auto-assigned'}</div>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
              <div className="text-lg font-semibold mb-2">Select a swarm</div>
              <div className="text-sm">Choose a swarm from the list to open the controller</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
