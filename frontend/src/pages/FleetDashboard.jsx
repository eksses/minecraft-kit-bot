import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { StatusBadge } from '../components/ui/StatusComponents';
import { RefreshCw } from 'lucide-react';

export default function FleetDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [bots, setBots] = useState([]);
  const [swarms, setSwarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashData, botsData, swarmsData] = await Promise.all([
        api.fleet.getDashboard(),
        api.fleet.getBots(),
        api.fleet.getSwarms(),
      ]);
      setDashboard(dashData);
      setBots(botsData);
      setSwarms(swarmsData);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load dashboard' });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="page-title">Fleet Dashboard</h1>
          <p className="page-subtitle">Overview of your bot fleet</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadDashboard}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{dashboard?.bots?.total || 0}</div>
          <div className="stat-label">Total Bots</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-value">{dashboard?.bots?.idle || 0}</div>
          <div className="stat-label">Idle</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-value">{dashboard?.bots?.working || 0}</div>
          <div className="stat-label">Working</div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-value">{dashboard?.bots?.error || 0}</div>
          <div className="stat-label">Error</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span>Task Queue</span>
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
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card stat-danger">
            <div className="stat-value">{dashboard?.tasks?.failed || 0}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span>Bots</span>
          <Link to="/fleet/bots" className="btn btn-ghost btn-sm">View All</Link>
        </div>
        {bots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No bots yet</div>
            <div className="empty-state-text">Add your first bot to get started</div>
            <Link to="/fleet/bots" className="btn btn-primary mt-md">Add Bot</Link>
          </div>
        ) : (
          <div>
            {bots.slice(0, 5).map((bot) => (
              <div key={bot.id} className="list-item">
                <div className="list-item-info">
                  <div className="avatar">{bot.name.charAt(0)}</div>
                  <div>
                    <div className="list-item-name">{bot.name}</div>
                    <div className="list-item-meta mono-sm">
                      {bot.username}
                    </div>
                  </div>
                </div>
                <StatusBadge status={bot.liveStatus?.status || bot.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <span>Swarms</span>
          <Link to="/fleet/swarms" className="btn btn-ghost btn-sm">View All</Link>
        </div>
        {swarms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No swarms yet</div>
            <div className="empty-state-text">Create a swarm to group your bots</div>
            <Link to="/fleet/swarms" className="btn btn-primary mt-md">Create Swarm</Link>
          </div>
        ) : (
          <div>
            {swarms.map((swarm) => (
              <div key={swarm.id} className="list-item">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
