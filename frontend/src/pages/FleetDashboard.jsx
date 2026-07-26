import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
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

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
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
  };

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
      <div className="flex items-center justify-center loading-state">
        Loading fleet data...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Command</h1>
          <p className="page-subtitle mono-sm">{bots.length} bots &middot; {onlineBots.length} online</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost btn-sm" onClick={loadDashboard} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <Link to="/fleet/bots" className="btn btn-primary btn-sm">
            <Plus size={16} /> Add Bot
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{onlineBots.length}<span className="text-muted">/{bots.length}</span></div>
          <div className="stat-label"><Bot size={14} /> Bots Online</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-value">{activeTasks}</div>
          <div className="stat-label"><Activity size={14} /> Active Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{swarms.length}</div>
          <div className="stat-label"><Layers size={14} /> Swarms</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{servers.length}</div>
          <div className="stat-label"><Server size={14} /> Servers</div>
        </div>
      </div>

      <div className="flex gap-sm mb-lg">
        <button className="btn btn-success btn-sm" onClick={handleStartAll} disabled={offlineBots.length === 0}>
          <Play size={14} /> Start All ({offlineBots.length})
        </button>
        <button className="btn btn-warning btn-sm" onClick={handleStopAll} disabled={onlineBots.length === 0}>
          <Square size={14} /> Stop All ({onlineBots.length})
        </button>
      </div>

      <div className="grid-2col">
        <div>
          <div className="section">
            <div className="section-header">
              <span>Bot Fleet</span>
              <Link to="/fleet/bots" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            {bots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No bots yet</div>
                <div className="empty-state-text">Add your first bot to get started</div>
                <Link to="/fleet/bots" className="btn btn-primary mt-md">Add Bot</Link>
              </div>
            ) : (
              bots.slice(0, 6).map((bot, i) => {
                const status = bot.liveStatus?.status || bot.status;
                const isOnline = status === 'ONLINE';
                return (
                  <div key={bot.id} className="list-item clickable stagger-item" onClick={() => navigate(`/fleet/bots/${bot.id}`)}>
                    <div className="list-item-info">
                      <div className="avatar">{bot.name.charAt(0)}</div>
                      <div className="flex-1">
                        <div className="list-item-name">{bot.name}</div>
                        <div className="list-item-meta mono-sm">{bot.username}</div>
                        {isOnline && bot.liveStatus?.health != null && (
                          <div className="flex gap-sm mt-xs">
                            <HealthBar value={bot.liveStatus.health} />
                            <FoodBar value={bot.liveStatus.food} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-sm" onClick={(e) => e.stopPropagation()}>
                      {isOnline && (
                        <button className="btn btn-ghost btn-sm hover-glow" onClick={() => handleQuickScan(bot.id)} aria-label="Quick scan">
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
          <div className="section">
            <div className="section-header">
              <span>Active Swarms</span>
              <Link to="/fleet/swarms" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            {swarms.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No swarms yet</div>
                <div className="empty-state-text">Create a swarm to group your bots</div>
                <Link to="/fleet/swarms" className="btn btn-primary mt-md">Create Swarm</Link>
              </div>
            ) : (
              swarms.slice(0, 3).map((swarm) => (
                <div key={swarm.id} className="list-item clickable" onClick={() => navigate('/fleet/swarms')}>
                  <div>
                    <div className="list-item-name">{swarm.name}</div>
                    <div className="list-item-meta">
                      {swarm.stats?.totalBots || 0} bots &middot; {swarm.loadBalancing}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-success text-sm">{swarm.stats?.idleBots || 0} idle</span>
                    <span className="separator">/</span>
                    <span className="text-warning text-sm">{swarm.stats?.activeTasks || 0} active</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="section">
            <div className="section-header">
              <span>Task Queue</span>
              <Link to="/fleet/tasks" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            <div className="stats-grid mb-0">
              <div className="stat-card">
                <div className="stat-value">{dashboard?.tasks?.pending || 0}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-value">{dashboard?.tasks?.active || 0}</div>
                <div className="stat-label">Active</div>
              </div>
              <div className="stat-card stat-success">
                <div className="stat-value">{dashboard?.tasks?.completed || 0}</div>
                <div className="stat-label">Done</div>
              </div>
              <div className="stat-card stat-danger">
                <div className="stat-value">{dashboard?.tasks?.failed || 0}</div>
                <div className="stat-label">Failed</div>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <span>Servers</span>
              <Link to="/fleet/servers" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            {servers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No servers yet</div>
                <div className="empty-state-text">Add a server to connect your bots</div>
              </div>
            ) : (
              servers.slice(0, 3).map((server) => (
                <div key={server.id} className="list-item">
                  <div>
                    <div className="list-item-name">{server.name}</div>
                    <div className="list-item-meta mono-sm">{server.host}:{server.port}</div>
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
