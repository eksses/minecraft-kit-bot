import { useEffect } from 'react';
import { useBotStore, useChestStore } from '../store';

export default function Dashboard() {
  const { status, fetchStatus } = useBotStore();
  const { chests, fetchChests } = useChestStore();

  useEffect(() => {
    fetchStatus();
    fetchChests();
  }, []);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      
      <div className="card-grid">
        <div className="card">
          <h3>Bot Status</h3>
          <div className={`status-indicator ${status?.online ? 'online' : 'offline'}`}>
            {status?.online ? 'Online' : 'Offline'}
          </div>
          <p>Server: {status?.server || 'Unknown'}</p>
          <p>Username: {status?.username || 'Unknown'}</p>
        </div>
        
        <div className="card">
          <h3>Chests</h3>
          <div className="big-number">{Object.keys(chests).length}</div>
          <p>Available kits</p>
        </div>
        
        <div className="card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <a href="/kits" className="btn">Order Kit</a>
            <a href="/chests" className="btn">Manage Chests</a>
            <a href="/bot" className="btn">Bot Control</a>
          </div>
        </div>
      </div>
    </div>
  );
}