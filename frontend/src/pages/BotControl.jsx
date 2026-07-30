import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { StatusBadge, HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { RefreshCw, Plus, X, Loader2, Bot, Server, Shield, Trash2, Play, Square, ChevronRight } from 'lucide-react';

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
        name: '', username: '', serverHost: '', serverPort: '25565',
        serverVersion: 'auto', authMode: 'ONLINE', authPassword: '',
      });
      loadData();
      addToast({ type: 'success', title: 'Bot added' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add bot' });
    }
  };

  const handleStartBot = async (botId) => {
    try { await api.fleet.startBot(botId); loadData(); addToast({ type: 'success', title: 'Bot started' }); }
    catch (err) { addToast({ type: 'error', title: 'Failed to start bot' }); }
  };

  const handleStopBot = async (botId) => {
    try { await api.fleet.stopBot(botId); loadData(); addToast({ type: 'success', title: 'Bot stopped' }); }
    catch (err) { addToast({ type: 'error', title: 'Failed to stop bot' }); }
  };

  const handleDeleteBot = async (botId) => {
    if (!confirm('Delete this bot?')) return;
    try { await api.fleet.deleteBot(botId); loadData(); addToast({ type: 'success', title: 'Bot deleted' }); }
    catch (err) { addToast({ type: 'error', title: 'Failed to delete bot' }); }
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
          <button
            className="h-9 px-3 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:text-mdb-text hover:bg-mdb-surface-high transition-colors inline-flex items-center gap-2"
            onClick={loadData}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="h-9 px-4 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={16} /> Add Bot
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-end animate-fade-in" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-border flex flex-col overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-mdb-border">
              <h2 className="text-lg font-semibold">Add New Bot</h2>
              <button className="h-8 w-8 rounded-lg hover:bg-mdb-surface-high flex items-center justify-center text-mdb-text-muted hover:text-mdb-text transition-colors" onClick={() => setShowAdd(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleAddBot} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Bot Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Delivery Bot 1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Minecraft Username</label>
                  <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required placeholder="bot_username" />
                </div>

                <div className="pt-2 pb-1 border-t border-mdb-border">
                  <span className="text-[11px] font-semibold text-mdb-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Server size={12} /> Server Connection
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Server IP / Host</label>
                  <input type="text" value={form.serverHost} onChange={(e) => setForm({...form, serverHost: e.target.value})} required placeholder="play.example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Port</label>
                    <input type="number" value={form.serverPort} onChange={(e) => setForm({...form, serverPort: e.target.value})} placeholder="25565" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Version</label>
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

                <div className="pt-2 pb-1 border-t border-mdb-border">
                  <span className="text-[11px] font-semibold text-mdb-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Shield size={12} /> Auth Mode
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Authentication</label>
                  <select value={form.authMode} onChange={(e) => setForm({...form, authMode: e.target.value})}>
                    <option value="ONLINE">Online (Premium/Microsoft)</option>
                    <option value="OFFLINE">Offline (Cracked)</option>
                  </select>
                </div>

                {form.authMode === 'OFFLINE' && (
                  <div>
                    <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Login Password</label>
                    <input type="password" value={form.authPassword} onChange={(e) => setForm({...form, authPassword: e.target.value})} placeholder="Server login password" />
                    <span className="block text-xs text-mdb-text-muted mt-1">Bot will execute /login &lt;password&gt; on spawn</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-mdb-border">
                  <button type="button" className="flex-1 h-10 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:bg-mdb-surface-high transition-colors" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="flex-1 h-10 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium transition-colors">Add Bot</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-mdb-text-muted">
          <Bot size={48} className="mb-4 opacity-30" />
          <div className="text-lg font-medium mb-1 text-mdb-text">No bots yet</div>
          <div className="text-sm mb-6">Add your first bot to get started</div>
          <button className="h-10 px-5 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium inline-flex items-center gap-2 transition-colors" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Bot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bots.map((bot) => {
            const status = bot.liveStatus?.status || bot.status;
            const isOnline = !['OFFLINE', 'ERROR'].includes(status);
            return (
              <div
                key={bot.id}
                className="bg-mdb-surface rounded-xl border border-mdb-border p-5 cursor-pointer hover:border-mdb-primary/50 transition-colors group"
                onClick={() => navigate(`/fleet/bots/${bot.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-mdb-surface-high flex items-center justify-center text-mdb-text-secondary group-hover:text-mdb-primary transition-colors">
                      <Bot size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-mdb-text">{bot.name}</div>
                      <div className="text-xs text-mdb-text-muted font-mono">{bot.username}</div>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="text-xs text-mdb-text-muted mb-3 font-mono">
                  {bot.serverHost || 'No server'}:{bot.serverPort || 25565}
                  {bot.authMode === 'OFFLINE' && <span className="ml-2 text-amber-400">Offline</span>}
                </div>

                {isOnline && (
                  <div className="space-y-2 mb-3">
                    {bot.liveStatus?.health != null && <HealthBar value={bot.liveStatus.health} />}
                    {bot.liveStatus?.food != null && <FoodBar value={bot.liveStatus.food} />}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-mdb-border">
                  <button
                    className="h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors hover:bg-mdb-surface-high text-mdb-text-secondary"
                    onClick={(e) => { e.stopPropagation(); navigate(`/fleet/bots/${bot.id}`); }}
                  >
                    Details <ChevronRight size={14} />
                  </button>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {isOnline ? (
                      <button className="h-8 px-3 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-red-500/20 transition-colors" onClick={() => handleStopBot(bot.id)}>
                        <Square size={12} /> Stop
                      </button>
                    ) : (
                      <button className="h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors" onClick={() => handleStartBot(bot.id)}>
                        <Play size={12} /> Start
                      </button>
                    )}
                    <button className="h-8 px-3 rounded-lg border border-mdb-border text-xs font-medium text-mdb-text-muted hover:text-red-400 hover:border-red-400/30 transition-colors inline-flex items-center gap-1.5" onClick={() => handleDeleteBot(bot.id)}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
