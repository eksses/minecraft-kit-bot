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
    return <div className="p-12 text-center text-mdb-text-muted">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Bots</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">{bots.length} bots configured</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={loadData} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Bot
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-stretch justify-end" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-surface-high flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-mdb-surface-high">
              <span className="text-lg font-bold">Add New Bot</span>
              <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => setShowAdd(false)}>X</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleAddBot}>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Bot Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Delivery Bot 1" />
                </div>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Minecraft Username</label>
                  <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required placeholder="bot_username" />
                </div>

                <div className="font-mono text-[11px] font-semibold text-mdb-text-muted uppercase tracking-widest py-2 my-2 border-t border-mdb-outline-variant">Server Connection</div>

                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Server IP / Host</label>
                  <input type="text" value={form.serverHost} onChange={(e) => setForm({...form, serverHost: e.target.value})} required placeholder="play.example.com" />
                </div>
                <div className="flex gap-2">
                  <div className="mb-4 flex-1">
                    <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Port</label>
                    <input type="number" value={form.serverPort} onChange={(e) => setForm({...form, serverPort: e.target.value})} placeholder="25565" />
                  </div>
                  <div className="mb-4 flex-1">
                    <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Version</label>
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

                <div className="font-mono text-[11px] font-semibold text-mdb-text-muted uppercase tracking-widest py-2 my-2 border-t border-mdb-outline-variant">Auth Mode</div>

                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Authentication</label>
                  <select value={form.authMode} onChange={(e) => setForm({...form, authMode: e.target.value})}>
                    <option value="ONLINE">Online (Premium/Microsoft)</option>
                    <option value="OFFLINE">Offline (Cracked)</option>
                  </select>
                </div>

                {form.authMode === 'OFFLINE' && (
                  <div className="mb-4">
                    <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Login Password</label>
                    <input type="password" value={form.authPassword} onChange={(e) => setForm({...form, authPassword: e.target.value})} placeholder="Server login password" />
                    <span className="block text-xs text-mdb-text-muted mt-1 font-mono">Bot will execute /login {`<password>`} on spawn</span>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button type="button" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary">Add Bot</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
          <div className="text-lg font-semibold mb-2">No bots yet</div>
          <div className="text-sm text-mdb-text-muted mb-4">Add your first bot to get started</div>
          <button className="inline-flex items-center gap-2 px-5 h-12 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-4" onClick={() => setShowAdd(true)}>Add Bot</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bots.map((bot) => {
            const status = bot.liveStatus?.status || bot.status;
            return (
              <div key={bot.id} className="bg-mdb-surface border border-mdb-surface-high p-6 mb-4 cursor-pointer transition-[border-color] hover:border-mdb-primary" onClick={() => navigate(`/fleet/bots/${bot.id}`)}>
                <div className="flex items-center justify-between mb-4">
                  <StatusBadge status={status} />
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {status === 'OFFLINE' ? (
                      <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-online text-mdb-surface-lowest" onClick={() => handleStartBot(bot.id)}>Start</button>
                    ) : (
                      <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-working text-mdb-surface-lowest" onClick={() => handleStopBot(bot.id)}>Stop</button>
                    )}
                    <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10" onClick={() => handleDeleteBot(bot.id)}>Delete</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-mdb-text-secondary text-sm mb-4">
                  <div className="font-semibold">{bot.name}</div>
                  <div className="font-mono text-xs text-mdb-text-muted">{bot.username}</div>
                  <div className="font-mono text-xs text-mdb-text-muted">{bot.serverHost || 'No server'}:{bot.serverPort || 25565}</div>
                  {bot.authMode === 'OFFLINE' && (
                    <div className="text-[12px] text-mdb-working">Offline Auth</div>
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
