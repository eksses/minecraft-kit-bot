import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { useRealtime } from '../hooks/useRealtime';
import { Button, Card, Input, StatusBadge, EmptyState, IconButton, Badge, Modal, Select } from '../components/ui';
import { RefreshCw, Plus, Play, Square, Send, ChevronRight, ChevronLeft, ExternalLink, ArrowDown, ArrowUp } from 'lucide-react';

export default function SwarmController() {
  const [swarms, setSwarms] = useState([]);
  const [selectedSwarm, setSelectedSwarm] = useState(null);
  const [bots, setBots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [broadcastCmd, setBroadcastCmd] = useState('');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
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
        const ids = new Set(swarmBots.map(b => b.id));
        return [...prev.filter(b => !ids.has(b.id)), ...swarmBots];
      });
      setTasks(prev => {
        const ids = new Set(swarmTasks.map(t => t.id));
        return [...prev.filter(t => !ids.has(t.id)), ...swarmTasks];
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
    for (const bot of offline) { try { await api.fleet.startBot(bot.id); } catch {} }
    addToast({ type: 'success', title: `Starting ${offline.length} bots` });
    setTimeout(loadSwarmData, 2000);
  };

  const handleStopAll = async () => {
    const online = getSwarmBots(selectedSwarm.id).filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    for (const bot of online) { try { await api.fleet.stopBot(bot.id); } catch {} }
    addToast({ type: 'success', title: `Stopping ${online.length} bots` });
    setTimeout(loadSwarmData, 2000);
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastCmd.trim()) return;
    const online = getSwarmBots(selectedSwarm.id).filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    for (const bot of online) { try { await api.fleet.sendCommand(bot.id, broadcastCmd); } catch {} }
    addToast({ type: 'success', title: `Command sent to ${online.length} bots` });
    setBroadcastCmd('');
  };

  const getSwarmBots = (id) => bots.filter(b => b.swarmId === id);

  const getSwarmStats = (swarmId) => {
    const swarmBots = getSwarmBots(swarmId);
    const swarmTasks = tasks.filter(t => t.swarmId === swarmId);
    const online = swarmBots.filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    return {
      totalBots: swarmBots.length,
      onlineBots: online.length,
      activeTasks: swarmTasks.filter(t => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length,
    };
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Swarm Controller</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">{swarms.length} swarms · {bots.length} total bots</p>
        </div>
        <div className="flex gap-2">
          <IconButton icon={RefreshCw} onClick={loadData} />
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Swarm</Button>
        </div>
      </div>

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Swarm" size="sm">
        <form onSubmit={handleCreateSwarm} className="space-y-4">
          <Input
            label="Swarm Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Delivery Swarm"
          />
          <Select
            label="Load Balancing"
            value={form.loadBalancing}
            onChange={(e) => setForm({ ...form, loadBalancing: e.target.value })}
            options={[
              { value: 'NEAREST', label: 'Nearest Bot' },
              { value: 'LEAST_BUSY', label: 'Least Busy' },
              { value: 'ROUND_ROBIN', label: 'Round Robin' },
            ]}
          />
          <div className="flex gap-4 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>

      {/* Layout: desktop side-by-side, mobile stacked */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Swarm list */}
        <div className={`lg:w-80 shrink-0 ${selectedSwarm ? 'hidden lg:block' : ''}`}>
          {swarms.length === 0 ? (
            <EmptyState
              title="No swarms yet"
              description="Create a swarm to group your bots"
              action={<Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Swarm</Button>}
            />
          ) : (
            <div className="space-y-2">
              {swarms.map((swarm) => {
                const stats = getSwarmStats(swarm.id);
                const isActive = selectedSwarm?.id === swarm.id;
                return (
                  <div
                    key={swarm.id}
                    onClick={() => setSelectedSwarm(swarm)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-mdb-surface border-mdb-primary'
                        : 'bg-mdb-surface border-mdb-border hover:border-mdb-primary/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{swarm.name}</div>
                      <div className="flex items-center gap-4 text-xs text-mdb-text-muted mt-1">
                        <span>{stats.totalBots} bots</span>
                        <span>{stats.activeTasks} tasks</span>
                      </div>
                    </div>
                    <IconButton
                      icon={ChevronRight}
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setSelectedSwarm(swarm); }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected swarm detail */}
        <div className={`flex-1 min-w-0 ${!selectedSwarm ? 'hidden lg:flex' : ''}`}>
          {selectedSwarm ? (
            <div className="space-y-4">
              {/* Back button (mobile only) */}
              <Button
                variant="ghost"
                size="sm"
                icon={ChevronLeft}
                onClick={() => setSelectedSwarm(null)}
                className="lg:hidden"
              >
                Back to swarms
              </Button>

              {/* Swarm header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedSwarm.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-mdb-text-muted mt-1">
                    <Badge variant="success" dot>{getSwarmStats(selectedSwarm.id).onlineBots} online</Badge>
                    <Badge>{getSwarmStats(selectedSwarm.id).totalBots} bots</Badge>
                    <Badge>{getSwarmStats(selectedSwarm.id).activeTasks} active tasks</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" icon={<Play size={14} />} onClick={handleStartAll}>Start All</Button>
                  <Button variant="danger" size="sm" icon={<Square size={14} />} onClick={handleStopAll}>Stop All</Button>
                </div>
              </div>

              {/* Bot list */}
              <Card padding="none">
                <div className="px-5 py-4 border-b border-mdb-border flex items-center justify-between">
                  <span className="text-sm font-semibold">Bots</span>
                  <Select
                    value=""
                    onChange={(e) => { if (e.target.value) { handleAddBot(e.target.value); e.target.value = ''; } }}
                    options={[
                      { value: '', label: '+ Add Bot' },
                      ...bots.filter(b => !b.swarmId).map(b => ({ value: b.id, label: b.name })),
                    ]}
                    className="w-40"
                  />
                </div>
                {getSwarmBots(selectedSwarm.id).length === 0 ? (
                  <div className="py-12 text-center text-sm text-mdb-text-muted">No bots in swarm</div>
                ) : (
                  <div className="divide-y divide-mdb-border">
                    {getSwarmBots(selectedSwarm.id).map((bot) => {
                      const status = bot.liveStatus?.status || bot.status;
                      const isOnline = status === 'ONLINE';
                      return (
                        <div
                          key={bot.id}
                          onClick={() => navigate(`/fleet/bots/${bot.id}`)}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-mdb-surface-high/50 cursor-pointer transition-colors"
                        >
                          <StatusBadge status={status} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{bot.name}</span>
                          </div>
                          <div className="flex gap-1">
                            {isOnline ? (
                              <IconButton icon={Square} size="sm" className="text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); handleStopBot(bot.id); }} />
                            ) : (
                              <IconButton icon={Play} size="sm" className="text-emerald-400 hover:text-emerald-300" onClick={(e) => { e.stopPropagation(); handleStartBot(bot.id); }} />
                            )}
                            <IconButton
                              icon={ExternalLink}
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate(`/fleet/bots/${bot.id}`); }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Broadcast */}
              <Card>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={broadcastOpen ? ArrowDown : ArrowDown}
                  onClick={() => setBroadcastOpen(o => !o)}
                  className="w-full justify-between px-0"
                >
                  <span className="text-sm font-semibold">Broadcast Command</span>
                  <ArrowDown size={16} className={`text-mdb-text-muted transition-transform ${broadcastOpen ? 'rotate-180' : ''}`} />
                </Button>
                {broadcastOpen && (
                  <form onSubmit={handleBroadcast} className="flex gap-2 mt-3">
                    <Input
                      value={broadcastCmd}
                      onChange={(e) => setBroadcastCmd(e.target.value)}
                      placeholder="/say Hello swarm!"
                      className="flex-1 font-mono"
                    />
                    <Button type="submit" icon={<Send size={14} />}>Send</Button>
                  </form>
                )}
              </Card>

              {/* Tasks link */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Tasks</h3>
                    <p className="text-xs text-mdb-text-muted mt-0.5">
                      {getSwarmStats(selectedSwarm.id).activeTasks} active · {tasks.filter(t => t.swarmId === selectedSwarm.id).length} total
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ExternalLink size={14} />}
                    onClick={() => navigate(`/fleet/tasks?swarm=${selectedSwarm.id}`)}
                  >
                    View Tasks
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center py-20 text-mdb-text-muted">
              <div className="text-lg font-medium mb-1 text-mdb-text">Select a swarm</div>
              <div className="text-sm">Choose a swarm from the list to open the controller</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
