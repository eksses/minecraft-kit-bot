import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { StatusBadge, HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { RefreshCw } from 'lucide-react';

export default function BotControl() {
  const [bots, setBots] = useState([]);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', serverId: '' });
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [botsData, serversData] = await Promise.all([
        api.fleet.getBots(),
        api.fleet.getServers(),
      ]);
      setBots(botsData);
      setServers(serversData);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBot = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createBot(form);
      setShowAdd(false);
      setForm({ name: '', username: '', serverId: '' });
      loadData();
      addToast({ type: 'success', title: 'Bot added' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add bot' });
    }
  };

  const handleStartBot = async (botId) => {
    try {
      await api.fleet.startBot(botId);
      loadData();
      addToast({ type: 'success', title: 'Bot started' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to start bot' });
    }
  };

  const handleStopBot = async (botId) => {
    try {
      await api.fleet.stopBot(botId);
      loadData();
      addToast({ type: 'success', title: 'Bot stopped' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to stop bot' });
    }
  };

  const handleDeleteBot = async (botId) => {
    if (!confirm('Delete this bot?')) return;
    try {
      await api.fleet.deleteBot(botId);
      loadData();
      addToast({ type: 'success', title: 'Bot deleted' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete bot' });
    }
  };

  if (loading) {
    return <div style={{padding: '48px', textAlign: 'center', color: 'var(--text-muted)'}}>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bots</h1>
          <p className="page-subtitle">Manage your Minecraft bots</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary btn-sm" onClick={loadData} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add Bot</button>
        </div>
      </div>

      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Add New Bot</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>X</button>
            </div>
            <div className="drawer-body">
              <form onSubmit={handleAddBot}>
                <div className="form-group">
                  <label className="form-label">Bot Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="My Bot" />
                </div>
                <div className="form-group">
                  <label className="form-label">Minecraft Username</label>
                  <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required placeholder="bot_username" />
                </div>
                <div className="form-group">
                  <label className="form-label">Server</label>
                  <select value={form.serverId} onChange={(e) => setForm({...form, serverId: e.target.value})} required>
                    <option value="">Select a server...</option>
                    {servers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-sm mt-md">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Bot</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {bots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No bots yet</div>
          <div className="empty-state-text">Add your first bot to get started</div>
          <button className="btn btn-primary mt-md" onClick={() => setShowAdd(true)}>Add Bot</button>
        </div>
      ) : (
        <div className="grid-2col">
          {bots.map((bot) => {
            const status = bot.liveStatus?.status || bot.status;
            return (
              <div key={bot.id} className="bot-card">
                <div className="bot-card-header">
                  <StatusBadge status={status} />
                  <div className="bot-card-actions">
                    {status === 'OFFLINE' ? (
                      <button className="btn btn-success btn-sm" onClick={() => handleStartBot(bot.id)}>Start</button>
                    ) : (
                      <button className="btn btn-warning btn-sm" onClick={() => handleStopBot(bot.id)}>Stop</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBot(bot.id)}>Delete</button>
                  </div>
                </div>
                <div className="bot-card-info">
                  <div style={{fontWeight: 600}}>{bot.name}</div>
                  <div style={{fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)'}}>{bot.username}</div>
                  <div>{bot.liveStatus?.serverConfig?.name || 'Not assigned'}</div>
                </div>
                {bot.liveStatus?.health != null && <HealthBar value={bot.liveStatus.health} />}
                {bot.liveStatus?.food != null && <FoodBar value={bot.liveStatus.food} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
