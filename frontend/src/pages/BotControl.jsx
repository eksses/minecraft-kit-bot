import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { StatusBadge, HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { RefreshCw, Plus } from 'lucide-react';

export default function BotControl() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    username: '',
    serverHost: '',
    serverPort: '25565',
    serverVersion: 'auto',
    authMode: 'ONLINE',
    authPassword: '',
  });
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const botsData = await api.fleet.getBots();
      setBots(botsData);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load bots' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBot = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createBot({
        ...form,
        serverPort: parseInt(form.serverPort) || 25565,
      });
      setShowAdd(false);
      setForm({
        name: '',
        username: '',
        serverHost: '',
        serverPort: '25565',
        serverVersion: 'auto',
        authMode: 'ONLINE',
        authPassword: '',
      });
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
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bots</h1>
          <p className="page-subtitle">{bots.length} bots configured</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost btn-sm" onClick={loadData} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Bot
          </button>
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
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Delivery Bot 1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Minecraft Username</label>
                  <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required placeholder="bot_username" />
                </div>

                <div className="form-divider">Server Connection</div>

                <div className="form-group">
                  <label className="form-label">Server IP / Host</label>
                  <input type="text" value={form.serverHost} onChange={(e) => setForm({...form, serverHost: e.target.value})} required placeholder="play.example.com" />
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Port</label>
                    <input type="number" value={form.serverPort} onChange={(e) => setForm({...form, serverPort: e.target.value})} placeholder="25565" />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Version</label>
                    <select value={form.serverVersion} onChange={(e) => setForm({...form, serverVersion: e.target.value})}>
                      <option value="auto">Auto Detect</option>
                      <option value="1.21.4">1.21.4</option>
                      <option value="1.21.3">1.21.3</option>
                      <option value="1.21.2">1.21.2</option>
                      <option value="1.21.1">1.21.1</option>
                      <option value="1.21">1.21</option>
                      <option value="1.20.6">1.20.6</option>
                      <option value="1.20.4">1.20.4</option>
                      <option value="1.20.2">1.20.2</option>
                      <option value="1.20.1">1.20.1</option>
                      <option value="1.20">1.20</option>
                      <option value="1.19.4">1.19.4</option>
                      <option value="1.19.3">1.19.3</option>
                      <option value="1.19.2">1.19.2</option>
                      <option value="1.18.2">1.18.2</option>
                      <option value="1.17.1">1.17.1</option>
                      <option value="1.16.5">1.16.5</option>
                      <option value="1.12.2">1.12.2</option>
                    </select>
                  </div>
                </div>

                <div className="form-divider">Auth Mode</div>

                <div className="form-group">
                  <label className="form-label">Authentication</label>
                  <select value={form.authMode} onChange={(e) => setForm({...form, authMode: e.target.value})}>
                    <option value="ONLINE">Online (Premium/Microsoft)</option>
                    <option value="OFFLINE">Offline (Cracked)</option>
                  </select>
                </div>

                {form.authMode === 'OFFLINE' && (
                  <div className="form-group">
                    <label className="form-label">Login Password</label>
                    <input type="password" value={form.authPassword} onChange={(e) => setForm({...form, authPassword: e.target.value})} placeholder="Server login password" />
                    <span className="form-hint">Bot will execute /login {`<password>`} on spawn</span>
                  </div>
                )}

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
              <div key={bot.id} className="bot-card clickable" onClick={() => navigate(`/fleet/bots/${bot.id}`)}>
                <div className="bot-card-header">
                  <StatusBadge status={status} />
                  <div className="bot-card-actions" onClick={(e) => e.stopPropagation()}>
                    {status === 'OFFLINE' ? (
                      <button className="btn btn-success btn-sm" onClick={() => handleStartBot(bot.id)}>Start</button>
                    ) : (
                      <button className="btn btn-warning btn-sm" onClick={() => handleStopBot(bot.id)}>Stop</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBot(bot.id)}>Delete</button>
                  </div>
                </div>
                <div className="bot-card-info">
                  <div className="bot-card-name">{bot.name}</div>
                  <div className="bot-card-username">{bot.username}</div>
                  <div className="mono-sm text-muted">{bot.serverHost || 'No server'}:{bot.serverPort || 25565}</div>
                  {bot.authMode === 'OFFLINE' && (
                    <div className="text-xs text-warning">Offline Auth</div>
                  )}
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
