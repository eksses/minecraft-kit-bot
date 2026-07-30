import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { useRealtime } from '../hooks/useRealtime';
import { StatusBadge, HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { RefreshCw, Plus, Play, Square, Scan, Layers, Server, Bot, Activity, Clock, AlertTriangle } from 'lucide-react';

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Fleet Command</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5 font-mono text-xs">{bots.length} bots &middot; {onlineBots.length} online</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={loadDashboard} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <Link to="/fleet/bots" className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-primary text-mdb-on-primary no-underline">
            <Plus size={16} /> Add Bot
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-mdb-surface border border-mdb-surface-high p-6">
          <div className="text-[28px] font-bold leading-tight tracking-tight">{onlineBots.length}<span className="text-mdb-text-muted">/{bots.length}</span></div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1"><Bot size={14} className="inline" /> Bots Online</div>
        </div>
        <div className="bg-mdb-surface border border-mdb-surface-high p-6">
          <div className="text-[28px] font-bold leading-tight tracking-tight text-mdb-working">{activeTasks}</div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1"><Activity size={14} className="inline" /> Active Tasks</div>
        </div>
        <div className="bg-mdb-surface border border-mdb-surface-high p-6">
          <div className="text-[28px] font-bold leading-tight tracking-tight">{swarms.length}</div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1"><Layers size={14} className="inline" /> Swarms</div>
        </div>
        <div className="bg-mdb-surface border border-mdb-surface-high p-6">
          <div className="text-[28px] font-bold leading-tight tracking-tracking">{servers.length}</div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1"><Server size={14} className="inline" /> Servers</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-online text-mdb-surface-lowest" onClick={handleStartAll} disabled={offlineBots.length === 0}>
          <Play size={14} /> Start All ({offlineBots.length})
        </button>
        <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-working text-mdb-surface-lowest" onClick={handleStopAll} disabled={onlineBots.length === 0}>
          <Square size={14} /> Stop All ({onlineBots.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
            <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant flex items-center justify-between">
              <span>Bot Fleet</span>
              <Link to="/fleet/bots" className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high no-underline">View All</Link>
            </div>
            {bots.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
                <div className="text-base font-semibold mb-2">No bots yet</div>
                <div className="text-sm mb-4">Add your first bot to get started</div>
                <Link to="/fleet/bots" className="inline-flex items-center gap-2 px-5 h-12 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-4 no-underline">Add Bot</Link>
              </div>
            ) : (
              bots.slice(0, 6).map((bot, i) => {
                const status = bot.liveStatus?.status || bot.status;
                const isOnline = status === 'ONLINE';
                return (
                  <div key={bot.id} className="flex items-center justify-between px-4 h-12 border-b border-mdb-outline-variant cursor-pointer transition-colors hover:bg-mdb-surface-high stagger-item" onClick={() => navigate(`/fleet/bots/${bot.id}`)}>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-mdb-surface-high flex items-center justify-center font-bold text-sm text-mdb-primary shrink-0">{bot.name.charAt(0)}</div>
                      <div className="flex-1">
                        <div className="font-semibold">{bot.name}</div>
                        <div className="font-mono text-xs text-mdb-text-muted">{bot.username}</div>
                        {isOnline && bot.liveStatus?.health != null && (
                          <div className="flex gap-2 mt-1">
                            <HealthBar value={bot.liveStatus.health} />
                            <FoodBar value={bot.liveStatus.food} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {isOnline && (
                        <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high hover-glow" onClick={() => handleQuickScan(bot.id)} aria-label="Quick scan">
                          <Scan size={14} />
                        </button>
                      )}
                      <StatusBadge status={status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
            <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant flex items-center justify-between">
              <span>Active Swarms</span>
              <Link to="/fleet/swarms" className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high no-underline">View All</Link>
            </div>
            {swarms.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
                <div className="text-base font-semibold mb-2">No swarms yet</div>
                <div className="text-sm mb-4">Create a swarm to group your bots</div>
                <Link to="/fleet/swarms" className="inline-flex items-center gap-2 px-5 h-12 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-4 no-underline">Create Swarm</Link>
              </div>
            ) : (
              swarms.slice(0, 3).map((swarm) => (
                <div key={swarm.id} className="flex items-center justify-between px-4 h-12 border-b border-mdb-outline-variant cursor-pointer transition-colors hover:bg-mdb-surface-high" onClick={() => navigate('/fleet/swarms')}>
                  <div>
                    <div className="font-semibold">{swarm.name}</div>
                    <div className="text-[13px] text-mdb-text-muted">
                      {swarm.stats?.totalBots || 0} bots &middot; {swarm.loadBalancing}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-mdb-online text-sm">{swarm.stats?.idleBots || 0} idle</span>
                    <span className="mx-1 text-mdb-outline-variant">/</span>
                    <span className="text-mdb-working text-sm">{swarm.stats?.activeTasks || 0} active</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
            <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant flex items-center justify-between">
              <span>Task Queue</span>
              <Link to="/fleet/tasks" className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high no-underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-0">
              <div className="bg-mdb-surface border border-mdb-surface-high p-6">
                <div className="text-[28px] font-bold leading-tight tracking-tight">{dashboard?.tasks?.pending || 0}</div>
                <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1">Pending</div>
              </div>
              <div className="bg-mdb-surface border border-mdb-surface-high p-6">
                <div className="text-[28px] font-bold leading-tight tracking-tight text-mdb-working">{dashboard?.tasks?.active || 0}</div>
                <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1">Active</div>
              </div>
              <div className="bg-mdb-surface border border-mdb-surface-high p-6">
                <div className="text-[28px] font-bold leading-tight tracking-tight text-mdb-online">{dashboard?.tasks?.completed || 0}</div>
                <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1">Done</div>
              </div>
              <div className="bg-mdb-surface border border-mdb-surface-high p-6">
                <div className="text-[28px] font-bold leading-tight tracking-tight text-mdb-status-error">{dashboard?.tasks?.failed || 0}</div>
                <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mt-1">Failed</div>
              </div>
            </div>
          </div>

          <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
            <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant flex items-center justify-between">
              <span>Servers</span>
              <Link to="/fleet/servers" className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high no-underline">View All</Link>
            </div>
            {servers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
                <div className="text-base font-semibold mb-2">No servers yet</div>
                <div className="text-sm mb-4">Add a server to connect your bots</div>
              </div>
            ) : (
              servers.slice(0, 3).map((server) => (
                <div key={server.id} className="flex items-center justify-between px-4 h-12 border-b border-mdb-outline-variant">
                  <div>
                    <div className="font-semibold">{server.name}</div>
                    <div className="font-mono text-xs text-mdb-text-muted">{server.host}:{server.port}</div>
                  </div>
                  <StatusBadge status="ONLINE" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
