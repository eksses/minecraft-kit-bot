import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try { setDashboard(await api.fleet.getDashboard()); }
    catch (err) { addToast({ type: 'error', title: 'Failed to load dashboard' }); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="loading-state">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Fleet overview and status</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{dashboard?.bots?.total || 0}</div>
          <div className="stat-label">Total Bots</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-value">{(dashboard?.bots?.idle || 0) + (dashboard?.bots?.working || 0)}</div>
          <div className="stat-label">Active Bots</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-value">{dashboard?.tasks?.active || 0}</div>
          <div className="stat-label">Active Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard?.swarms?.total || 0}</div>
          <div className="stat-label">Swarms</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">Bot Status</div>
        <div className="stats-grid mb-0">
          <div className="stat-card stat-success">
            <div className="stat-value">{dashboard?.bots?.idle || 0}</div>
            <div className="stat-label">Idle</div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-value">{dashboard?.bots?.working || 0}</div>
            <div className="stat-label">Working</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{dashboard?.bots?.offline || 0}</div>
            <div className="stat-label">Offline</div>
          </div>
          <div className="stat-card stat-danger">
            <div className="stat-value">{dashboard?.bots?.error || 0}</div>
            <div className="stat-label">Error</div>
          </div>
        </div>
      </div>
    </div>
  );
}
