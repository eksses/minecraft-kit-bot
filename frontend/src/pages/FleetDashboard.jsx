import { useState, useEffect } from 'react';
import { Bot, Server, Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge, HealthBar, FoodBar, StatsCard } from '../components/ui/StatusComponents';

export default function FleetDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashData, botsData] = await Promise.all([
        api.fleet.getDashboard(),
        api.fleet.getBots(),
      ]);
      setDashboard(dashData);
      setBots(botsData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fleet Dashboard</h1>
        <p className="text-slate-500">Monitor and manage your bot fleet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          label="Total Bots" 
          value={dashboard?.bots?.total || 0} 
          icon={Bot}
          color="slate"
        />
        <StatsCard 
          label="Active Bots" 
          value={dashboard?.bots?.idle + dashboard?.bots?.working || 0} 
          icon={Activity}
          color="emerald"
        />
        <StatsCard 
          label="Active Tasks" 
          value={dashboard?.tasks?.active || 0} 
          icon={Clock}
          color="amber"
        />
        <StatsCard 
          label="Completed" 
          value={dashboard?.tasks?.completed || 0} 
          icon={CheckCircle}
          color="blue"
        />
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Bot Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-500">{dashboard?.bots?.idle || 0}</div>
            <div className="text-sm text-slate-500">Idle</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-500">{dashboard?.bots?.working || 0}</div>
            <div className="text-sm text-slate-500">Working</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-500">{dashboard?.bots?.offline || 0}</div>
            <div className="text-sm text-slate-500">Offline</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">{dashboard?.bots?.error || 0}</div>
            <div className="text-sm text-slate-500">Error</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">{dashboard?.swarms?.total || 0}</div>
            <div className="text-sm text-slate-500">Swarms</div>
          </div>
        </div>
      </div>

      {/* Task Queue */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Task Queue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{dashboard?.tasks?.pending || 0}</div>
            <div className="text-sm text-blue-600">Pending</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{dashboard?.tasks?.active || 0}</div>
            <div className="text-sm text-amber-600">Active</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{dashboard?.tasks?.completed || 0}</div>
            <div className="text-sm text-emerald-600">Completed</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{dashboard?.tasks?.failed || 0}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
        </div>
      </div>

      {/* Recent Bots */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Your Bots</h2>
          <a href="/fleet/bots" className="text-sm text-blue-600 hover:text-blue-700">
            View All
          </a>
        </div>
        
        {bots.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No bots yet. Add your first bot to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bots.slice(0, 5).map((bot) => (
              <div 
                key={bot.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{bot.name}</div>
                    <div className="text-sm text-slate-500">{bot.username}</div>
                  </div>
                </div>
                <StatusBadge status={bot.liveStatus?.status || bot.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}