import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { useRealtime } from '../hooks/useRealtime';
import { Button, Card, CardHeader, StatCard, StatusBadge, EmptyState, LoadingState, Avatar } from '../components/ui';
import { RefreshCw, Play, Square, Bot, Activity, Layers, Server, Plus } from 'lucide-react';

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
    } catch {
      addToast({ type: 'error', title: 'Failed to load dashboard' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const rt = useRealtime(bots.map(b => b.id), swarms.map(s => s.id));

  useEffect(() => {
    if (!rt?.on) return;
    const unsubs = [
      rt.on('bot_status', () => loadDashboard()),
      rt.on('swarm_update', () => loadDashboard()),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [rt, loadDashboard]);

  const handleStartAll = async () => {
    const offline = bots.filter(b => (b.liveStatus?.status || b.status) === 'OFFLINE');
    for (const bot of offline) {
      try { await api.fleet.startBot(bot.id); } catch {}
    }
    addToast({ type: 'success', title: `Starting ${offline.length} bots` });
    setTimeout(loadDashboard, 2000);
  };

  const handleStopAll = async () => {
    const online = bots.filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
    for (const bot of online) {
      try { await api.fleet.stopBot(bot.id); } catch {}
    }
    addToast({ type: 'success', title: `Stopping ${online.length} bots` });
    setTimeout(loadDashboard, 2000);
  };

  const onlineBots = bots.filter(b => (b.liveStatus?.status || b.status) === 'ONLINE');
  const offlineBots = bots.filter(b => (b.liveStatus?.status || b.status) === 'OFFLINE');

  if (loading) return <LoadingState text="Loading fleet data..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-mdb-text tracking-tight">Fleet Command</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">{bots.length} bots · {onlineBots.length} online</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={RefreshCw} onClick={loadDashboard} aria-label="Refresh" />
          <Button as={Link} to="/fleet/bots" icon={Plus}>Add Bot</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Bots Online" value={`${onlineBots.length}/${bots.length}`} icon={Bot} />
        <StatCard label="Active Tasks" value={dashboard?.tasks?.active || 0} icon={Activity} color="warning" />
        <StatCard label="Swarms" value={swarms.length} icon={Layers} />
        <StatCard label="Servers" value={servers.length} icon={Server} />
      </div>

      <div className="flex gap-3">
        <Button variant="success" icon={Play} onClick={handleStartAll} disabled={offlineBots.length === 0}>
          Start All ({offlineBots.length})
        </Button>
        <Button variant="danger" icon={Square} onClick={handleStopAll} disabled={onlineBots.length === 0}>
          Stop All ({onlineBots.length})
        </Button>
      </div>

      <Card padding="none">
        <CardHeader
          title="Bot Fleet"
          action={<Button variant="ghost" size="sm" as={Link} to="/fleet/bots">View All</Button>}
        />
        {bots.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No bots yet"
            description="Add your first bot to get started"
            action={<Button as={Link} to="/fleet/bots" icon={Plus}>Add Bot</Button>}
          />
        ) : (
          <div className="divide-y divide-mdb-border">
            {bots.slice(0, 6).map(bot => {
              const status = bot.liveStatus?.status || bot.status;
              return (
                <div
                  key={bot.id}
                  className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-mdb-surface-high transition-colors"
                  onClick={() => navigate(`/fleet/bots/${bot.id}`)}
                >
                  <Avatar name={bot.name} size="sm" />
                  <span className="flex-1 text-sm font-medium truncate">{bot.name}</span>
                  <StatusBadge status={status} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
