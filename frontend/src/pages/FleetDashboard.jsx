import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { useRealtime } from '../hooks/useRealtime';
import { StatusBadge, HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { RefreshCw, Plus, Play, Square, Scan, Layers, Server, Bot, Activity } from 'lucide-react';

export default function FleetDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [bots, setBots] = useState([]);
  const [swarms, setSwarms] = useState([]);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    try {
      const [dashData, botsData, swarmsData, serversData] = await Promise.all([
        api.fleet.getDashboard(),
        api.fleet.getBots(),
        api.fleet.getSwarms(),
        api.fleet.getServers(),
      ]);
      setDashboard(dashData);
      setBots(botsData);
      setSwarms(swarmsData);
      setServers(serversData);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load dashboard' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const botIds = bots.map(b => b.id);
  const swarmIds = swarms.map(s => s.id);
  const rt = useRealtime(botIds, swarmIds);

  useEffect(() => {
    if (!rt?.on) return;
    const unsubs = [
      rt.on('bot_status', () => loadDashboard()),
      rt.on('swarm_update', () => loadDashboard()),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [rt, loadDashboard]);

  const handleStartAll = async () => {
    const offlineBots = bots.filter(b => (b.liveStatus?.status || b.status) === 'OFFLINE');
    for (const bot of offlineBots) {
      try { await api.fleet.startBot(bot.id); } catch {}
    }
    addToast({ type: 'success', title: `Starting ${offlineBots.length} bots` });
    setTimeout(loadDashboard, 2000);
  };

  const handleStopAll = async () => {
    const onlineBots = bots.filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    for (const bot of onlineBots) {
      try { await api.fleet.stopBot(bot.id); } catch {}
    }
    addToast({ type: 'success', title: `Stopping ${onlineBots.length} bots` });
    setTimeout(loadDashboard, 2000);
  };

  const handleQuickScan = async (botId) => {
    try {
      await api.chests.triggerScan(botId, 32);
      addToast({ type: 'success', title: 'Scan started' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to start scan' });
    }
  };

  const onlineBots = bots.filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
  const offlineBots = bots.filter(b => (b.liveStatus?.status || b.status) === 'OFFLINE');
  const activeTasks = dashboard?.tasks?.active || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-mdb-text-muted">
        Loading fleet data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-mdb-text tracking-tight">Fleet Command</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">{bots.length} bots · {onlineBots.length} online</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 h-9 px-3.5 text-sm font-medium text-mdb-text-secondary hover:text-mdb-text hover:bg-mdb-surface-high rounded-lg transition-colors"
            onClick={loadDashboard}
            aria-label="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <Link
            to="/fleet/bots"
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium bg-mdb-primary text-mdb-on-primary rounded-lg hover:bg-mdb-primary-hover no-underline transition-colors"
          >
            <Plus size={16} /> Add Bot
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-mdb-surface rounded-xl p-5 border border-mdb-border">
          <div className="text-2xl font-semibold leading-tight">{onlineBots.length}<span className="text-mdb-text-muted">/{bots.length}</span></div>
          <div className="text-sm text-mdb-text-muted flex items-center gap-1.5 mt-1.5">
            <Bot size={14} className="text-mdb-text-muted" /> Bots Online
          </div>
        </div>
        <div className="bg-mdb-surface rounded-xl p-5 border border-mdb-border">
          <div className="text-2xl font-semibold leading-tight text-mdb-working">{activeTasks}</div>
          <div className="text-sm text-mdb-text-muted flex items-center gap-1.5 mt-1.5">
            <Activity size={14} className="text-mdb-text-muted" /> Active Tasks
          </div>
        </div>
        <div className="bg-mdb-surface rounded-xl p-5 border border-mdb-border">
          <div className="text-2xl font-semibold leading-tight">{swarms.length}</div>
          <div className="text-sm text-mdb-text-muted flex items-center gap-1.5 mt-1.5">
            <Layers size={14} className="text-mdb-text-muted" /> Swarms
          </div>
        </div>
        <div className="bg-mdb-surface rounded-xl p-5 border border-mdb-border">
          <div className="text-2xl font-semibold leading-tight">{servers.length}</div>
          <div className="text-sm text-mdb-text-muted flex items-center gap-1.5 mt-1.5">
            <Server size={14} className="text-mdb-text-muted" /> Servers
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium border border-mdb-border rounded-lg text-mdb-text-secondary hover:text-mdb-success hover:border-mdb-success/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleStartAll}
          disabled={offlineBots.length === 0}
        >
          <Play size={14} /> Start All ({offlineBots.length})
        </button>
        <button
          className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium border border-mdb-border rounded-lg text-mdb-text-secondary hover:text-mdb-error hover:border-mdb-error/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleStopAll}
          disabled={onlineBots.length === 0}
        >
          <Square size={14} /> Stop All ({onlineBots.length})
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Bot Fleet */}
          <div className="bg-mdb-surface rounded-xl border border-mdb-border">
            <div className="px-5 py-4 border-b border-mdb-border flex items-center justify-between">
              <span className="text-base font-semibold">Bot Fleet</span>
              <Link to="/fleet/bots" className="inline-flex items-center gap-2 h-8 px-3 text-xs font-medium text-mdb-text-secondary hover:text-mdb-primary rounded-lg hover:bg-mdb-surface-high transition-colors no-underline">View All</Link>
            </div>
            {bots.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
                <div className="text-base font-semibold mb-2">No bots yet</div>
                <div className="text-sm mb-4">Add your first bot to get started</div>
                <Link to="/fleet/bots" className="inline-flex items-center gap-2 px-5 h-10 text-sm font-medium bg-mdb-primary text-mdb-on-primary rounded-lg mt-2 no-underline hover:bg-mdb-primary-hover transition-colors">Add Bot</Link>
              </div>
            ) : (
              <div className="divide-y divide-mdb-border">
                {bots.slice(0, 6).map((bot, i) => {
                  const status = bot.liveStatus?.status || bot.status;
                  const isOnline = status === 'ONLINE';
                  return (
                    <div
                      key={bot.id}
                      className="px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-mdb-surface-high stagger-item"
                      onClick={() => navigate(`/fleet/bots/${bot.id}`)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-mdb-surface-high flex items-center justify-center text-sm font-medium text-mdb-primary shrink-0">
                        {bot.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{bot.name}</div>
                        <div className="text-xs text-mdb-text-muted truncate">{bot.username}</div>
                        {isOnline && bot.liveStatus?.health != null && (
                          <div className="flex gap-2 mt-1">
                            <HealthBar value={bot.liveStatus.health} />
                            <FoodBar value={bot.liveStatus.food} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isOnline && (
                          <button
                            className="inline-flex items-center gap-2 h-8 px-2.5 text-xs font-medium text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high rounded-lg transition-colors"
                            onClick={() => handleQuickScan(bot.id)}
                            aria-label="Quick scan"
                          >
                            <Scan size={14} />
                          </button>
                        )}
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Servers */}
          <div className="bg-mdb-surface rounded-xl border border-mdb-border">
            <div className="px-5 py-4 border-b border-mdb-border flex items-center justify-between">
              <span className="text-base font-semibold">Servers</span>
              <Link to="/fleet/servers" className="inline-flex items-center gap-2 h-8 px-3 text-xs font-medium text-mdb-text-secondary hover:text-mdb-primary rounded-lg hover:bg-mdb-surface-high transition-colors no-underline">View All</Link>
            </div>
            {servers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
                <div className="text-base font-semibold mb-2">No servers yet</div>
                <div className="text-sm mb-4">Add a server to connect your bots</div>
              </div>
            ) : (
              <div className="divide-y divide-mdb-border">
                {servers.slice(0, 3).map((server) => (
                  <div key={server.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-mdb-surface-high flex items-center justify-center shrink-0">
                      <Server size={16} className="text-mdb-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{server.name}</div>
                      <div className="text-xs text-mdb-text-muted font-mono">{server.host}:{server.port}</div>
                    </div>
                    <StatusBadge status="ONLINE" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Active Swarms */}
          <div className="bg-mdb-surface rounded-xl border border-mdb-border">
            <div className="px-5 py-4 border-b border-mdb-border flex items-center justify-between">
              <span className="text-base font-semibold">Active Swarms</span>
              <Link to="/fleet/swarms" className="inline-flex items-center gap-2 h-8 px-3 text-xs font-medium text-mdb-text-secondary hover:text-mdb-primary rounded-lg hover:bg-mdb-surface-high transition-colors no-underline">View All</Link>
            </div>
            {swarms.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
                <div className="text-base font-semibold mb-2">No swarms yet</div>
                <div className="text-sm mb-4">Create a swarm to group your bots</div>
                <Link to="/fleet/swarms" className="inline-flex items-center gap-2 px-5 h-10 text-sm font-medium bg-mdb-primary text-mdb-on-primary rounded-lg mt-2 no-underline hover:bg-mdb-primary-hover transition-colors">Create Swarm</Link>
              </div>
            ) : (
              <div className="divide-y divide-mdb-border">
                {swarms.slice(0, 3).map((swarm) => (
                  <div
                    key={swarm.id}
                    className="px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-mdb-surface-high"
                    onClick={() => navigate('/fleet/swarms')}
                  >
                    <div className="w-9 h-9 rounded-lg bg-mdb-surface-high flex items-center justify-center shrink-0">
                      <Layers size={16} className="text-mdb-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{swarm.name}</div>
                      <div className="text-xs text-mdb-text-muted">
                        {swarm.stats?.totalBots || 0} bots · {swarm.loadBalancing}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-mdb-success text-sm font-medium">{swarm.stats?.idleBots || 0} idle</span>
                      <span className="mx-1 text-mdb-text-muted">/</span>
                      <span className="text-mdb-working text-sm font-medium">{swarm.stats?.activeTasks || 0} active</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task Queue Summary */}
          <div className="bg-mdb-surface rounded-xl border border-mdb-border">
            <div className="px-5 py-4 border-b border-mdb-border flex items-center justify-between">
              <span className="text-base font-semibold">Task Queue</span>
              <Link to="/fleet/tasks" className="inline-flex items-center gap-2 h-8 px-3 text-xs font-medium text-mdb-text-secondary hover:text-mdb-primary rounded-lg hover:bg-mdb-surface-high transition-colors no-underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
              <div className="bg-mdb-surface-high rounded-lg p-3 text-center">
                <div className="text-xl font-semibold">{dashboard?.tasks?.pending || 0}</div>
                <div className="text-xs text-mdb-text-muted mt-0.5">Pending</div>
              </div>
              <div className="bg-mdb-surface-high rounded-lg p-3 text-center">
                <div className="text-xl font-semibold text-mdb-working">{dashboard?.tasks?.active || 0}</div>
                <div className="text-xs text-mdb-text-muted mt-0.5">Active</div>
              </div>
              <div className="bg-mdb-surface-high rounded-lg p-3 text-center">
                <div className="text-xl font-semibold text-mdb-success">{dashboard?.tasks?.completed || 0}</div>
                <div className="text-xs text-mdb-text-muted mt-0.5">Done</div>
              </div>
              <div className="bg-mdb-surface-high rounded-lg p-3 text-center">
                <div className="text-xl font-semibold text-mdb-error">{dashboard?.tasks?.failed || 0}</div>
                <div className="text-xs text-mdb-text-muted mt-0.5">Failed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
