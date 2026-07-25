import { useState, useEffect } from 'react';
import { useBotStore } from '../store';
import { api } from '../services/api';

export default function BotControl() {
  const { status, fetchStatus } = useBotStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleLeave = async () => {
    if (!confirm('Are you sure you want the bot to leave the server?')) return;
    setLoading(true);
    await api.bot.leave();
    fetchStatus();
    setLoading(false);
  };

  const handleRestart = async () => {
    if (!confirm('Restart the bot?')) return;
    setLoading(true);
    await api.bot.restart();
    setTimeout(fetchStatus, 2000);
    setLoading(false);
  };

  return (
    <div className="page">
      <h1>Bot Control</h1>
      
      <div className="card">
        <div className="status-display">
          <div className={`status-indicator ${status?.online ? 'online' : 'offline'}`}>
            {status?.online ? 'Online' : 'Offline'}
          </div>
          <div className="status-info">
            <p><strong>Username:</strong> {status?.username || 'Unknown'}</p>
            <p><strong>Server:</strong> {status?.server || 'Unknown'}</p>
          </div>
        </div>
        
        <div className="button-group">
          <button 
            className="btn danger" 
            onClick={handleLeave} 
            disabled={loading || !status?.online}
          >
            Leave Server
          </button>
          <button 
            className="btn" 
            onClick={handleRestart}
            disabled={loading}
          >
            Restart Bot
          </button>
          <button 
            className="btn" 
            onClick={fetchStatus}
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}