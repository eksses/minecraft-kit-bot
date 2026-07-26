import { useState, useEffect } from 'react';
import { Puzzle, Activity } from 'lucide-react';

export default function DemoWidget() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/plugins/demo-everything/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="widget-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="widget">
      <div className="widget-header">
        <Puzzle size={16} />
        <span>Demo Plugin</span>
      </div>
      <div className="widget-body">
        <div className="widget-stat">
          <Activity size={14} />
          <span className="widget-stat-value">{status?.plugin?.version || '1.0.0'}</span>
          <span className="widget-stat-label">Version</span>
        </div>
        <div className="widget-stat">
          <span className="widget-stat-value">{status?.hasApiKey ? 'Yes' : 'No'}</span>
          <span className="widget-stat-label">API Key</span>
        </div>
      </div>
    </div>
  );
}
