import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { Button, Card, Input, Select, StatusBadge, EmptyState, LoadingState, Drawer, IconButton, Avatar, Badge } from '../components/ui';
import { RefreshCw, Plus, Bot, Play, Square, Search } from 'lucide-react';

export default function BotControl() {
  const location = useLocation();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(() => new URLSearchParams(location.search).get('add') === 'true');
  const [search, setSearch] = useState('');
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

  const filteredBots = useMemo(() => {
    if (!search) return bots;
    const q = search.toLowerCase();
    return bots.filter(b => b.name.toLowerCase().includes(q) || b.username.toLowerCase().includes(q));
  }, [bots, search]);

  const onlineCount = bots.filter(b => !['OFFLINE', 'ERROR'].includes(b.liveStatus?.status || b.status)).length;

  const handleAddBot = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createBot({ ...form, serverPort: parseInt(form.serverPort) || 25565 });
      setShowAdd(false);
      setForm({ name: '', username: '', serverHost: '', serverPort: '25565', serverVersion: 'auto', authMode: 'ONLINE', authPassword: '' });
      loadData();
      addToast({ type: 'success', title: 'Bot added' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add bot' });
    }
  };

  const handleStart = async (id) => {
    try { await api.fleet.startBot(id); loadData(); addToast({ type: 'success', title: 'Bot started' }); }
    catch { addToast({ type: 'error', title: 'Failed to start bot' }); }
  };

  const handleStop = async (id) => {
    try { await api.fleet.stopBot(id); loadData(); addToast({ type: 'success', title: 'Bot stopped' }); }
    catch { addToast({ type: 'error', title: 'Failed to stop bot' }); }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-4 text-slate-100">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-2xl font-bold text-white">Bots</h1>
          <div className="flex items-center gap-2 shrink-0">
            <button className="p-2.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-lg border border-slate-700/50">
              <RefreshCw className="w-4 h-4"/>
            </button>
            <button className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md">
              <Plus className="w-4 h-4 stroke-[3]"/>
              Add Bot
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="sm" className="animate-pulse bg-[#131824] border border-slate-800/80">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-slate-800/50" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-slate-800/50 rounded" />
                  <div className="h-3 w-20 bg-slate-800/50 rounded" />
                </div>
                <div className="h-5 w-14 bg-slate-800/50 rounded-full" />
              </div>
              <div className="pt-3 border-t border-slate-800/60">
                <div className="h-8 w-20 bg-slate-800/50 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-4 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <h1 className="text-2xl font-bold text-white">Bots</h1>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={loadData} className="p-2.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw className="w-4 h-4"/>
          </button>
          <button onClick={() => setShowAdd(true)} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-colors">
            <Plus className="w-4 h-4 stroke-[3]"/>
            Add Bot
          </button>
        </div>
      </div>

      {/* Status Badges Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">{bots.length} bot{bots.length !== 1 ? 's' : ''} configured</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {onlineCount} online
        </span>
        {bots.length - onlineCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {bots.length - onlineCount} offline
          </span>
        )}
      </div>

      {/* Search Bar */}
      {bots.length > 0 && (
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"/>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bots by name or username..."
            className="w-full bg-[#131824] border border-slate-800 text-slate-100 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500/60 placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Add Bot Drawer */}
      <Drawer isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Bot">
        <form onSubmit={handleAddBot} className="space-y-4">
          <Input label="Bot Name" required placeholder="Delivery Bot 1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Minecraft Username" required placeholder="bot_username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />

          <div className="pt-2 border-t border-slate-800/50">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Server Connection</span>
          </div>

          <Input label="Server IP / Host" required placeholder="play.example.com" value={form.serverHost} onChange={(e) => setForm({ ...form, serverHost: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Port" type="number" placeholder="25565" value={form.serverPort} onChange={(e) => setForm({ ...form, serverPort: e.target.value })} />
            <Select label="Version" value={form.serverVersion} onChange={(e) => setForm({ ...form, serverVersion: e.target.value })} options={[
              { value: 'auto', label: 'Auto Detect' },
              { value: '1.21.4', label: '1.21.4' }, { value: '1.21.3', label: '1.21.3' },
              { value: '1.21.2', label: '1.21.2' }, { value: '1.21.1', label: '1.21.1' },
              { value: '1.21', label: '1.21' }, { value: '1.20.6', label: '1.20.6' },
              { value: '1.20.4', label: '1.20.4' }, { value: '1.20.2', label: '1.20.2' },
              { value: '1.20.1', label: '1.20.1' }, { value: '1.20', label: '1.20' },
              { value: '1.19.4', label: '1.19.4' }, { value: '1.19.3', label: '1.19.3' },
              { value: '1.19.2', label: '1.19.2' }, { value: '1.18.2', label: '1.18.2' },
              { value: '1.17.1', label: '1.17.1' }, { value: '1.16.5', label: '1.16.5' },
              { value: '1.12.2', label: '1.12.2' },
            ]} />
          </div>

          <div className="pt-2 border-t border-slate-800/50">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Auth Mode</span>
          </div>

          <Select label="Authentication" value={form.authMode} onChange={(e) => setForm({ ...form, authMode: e.target.value })} options={[
            { value: 'ONLINE', label: 'Online (Premium/Microsoft)' },
            { value: 'OFFLINE', label: 'Offline (Cracked)' },
          ]} />

          {form.authMode === 'OFFLINE' && (
            <Input label="Login Password" type="password" placeholder="Server login password" helperText="Bot will execute /login <password> on spawn" value={form.authPassword} onChange={(e) => setForm({ ...form, authPassword: e.target.value })} />
          )}

          <div className="flex gap-4 pt-4 border-t border-slate-800/50">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Add Bot</Button>
          </div>
        </form>
      </Drawer>

      {/* Bot List / Empty States */}
      {bots.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No bots yet"
          description="Add your first bot to get started"
          action={<Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add Bot</Button>}
        />
      ) : filteredBots.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No bots found"
          description={`No bots match "${search}"`}
          action={<Button variant="secondary" onClick={() => setSearch('')}>Clear Search</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredBots.map((bot) => {
            const status = bot.liveStatus?.status || bot.status;
            const isOnline = !['OFFLINE', 'ERROR'].includes(status);
            return (
              <Card key={bot.id} className="bg-[#131824] border border-slate-800/80 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-4">
                  <Avatar name={bot.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{bot.name}</div>
                    <div className="text-xs text-slate-400 font-mono truncate">{bot.username}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <button onClick={() => navigate(`/fleet/bots/${bot.id}`)} className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/60 transition-colors">
                    Details
                  </button>
                  <button className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors" onClick={isOnline ? () => handleStop(bot.id) : () => handleStart(bot.id)}>
                    <Play className="w-3.5 h-3.5 fill-current"/>
                    {isOnline ? 'Stop' : 'Start'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}