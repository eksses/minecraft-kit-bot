import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import { Button, Card, Input, Select, StatusBadge, EmptyState, LoadingState, Drawer, IconButton, Avatar, SearchInput, Badge } from '../components/ui';
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
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-7 w-24 bg-mdb-surface-high rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-mdb-surface-high rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-mdb-surface-high rounded-lg animate-pulse" />
            <div className="h-9 w-24 bg-mdb-surface-high rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="sm" className="animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-mdb-surface-high" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-mdb-surface-high rounded" />
                  <div className="h-3 w-20 bg-mdb-surface-high rounded" />
                </div>
                <div className="h-5 w-14 bg-mdb-surface-high rounded-full" />
              </div>
              <div className="pt-3 border-t border-mdb-border">
                <div className="h-8 w-20 bg-mdb-surface-high rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Bots</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">
            {bots.length} bot{bots.length !== 1 ? 's' : ''} configured
            {bots.length > 0 && (
              <span className="ml-2">
                <Badge variant="success" size="sm" dot>{onlineCount} online</Badge>
                {bots.length - onlineCount > 0 && (
                  <Badge variant="default" size="sm" dot className="ml-1.5">{bots.length - onlineCount} offline</Badge>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <IconButton icon={RefreshCw} onClick={loadData} tooltip="Refresh" />
          <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add Bot</Button>
        </div>
      </div>

      {bots.length > 0 && (
        <div className="mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search bots by name or username..." />
        </div>
      )}

      <Drawer isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Bot">
        <form onSubmit={handleAddBot} className="space-y-4">
          <Input label="Bot Name" required placeholder="Delivery Bot 1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Minecraft Username" required placeholder="bot_username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />

          <div className="pt-2 border-t border-mdb-border">
            <span className="text-[11px] font-semibold text-mdb-text-muted uppercase tracking-widest">Server Connection</span>
          </div>

          <Input label="Server IP / Host" required placeholder="play.example.com" value={form.serverHost} onChange={(e) => setForm({ ...form, serverHost: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
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

          <div className="pt-2 border-t border-mdb-border">
            <span className="text-[11px] font-semibold text-mdb-text-muted uppercase tracking-widest">Auth Mode</span>
          </div>

          <Select label="Authentication" value={form.authMode} onChange={(e) => setForm({ ...form, authMode: e.target.value })} options={[
            { value: 'ONLINE', label: 'Online (Premium/Microsoft)' },
            { value: 'OFFLINE', label: 'Offline (Cracked)' },
          ]} />

          {form.authMode === 'OFFLINE' && (
            <Input label="Login Password" type="password" placeholder="Server login password" helperText="Bot will execute /login <password> on spawn" value={form.authPassword} onChange={(e) => setForm({ ...form, authPassword: e.target.value })} />
          )}

          <div className="flex gap-3 pt-4 border-t border-mdb-border">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Add Bot</Button>
          </div>
        </form>
      </Drawer>

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
              <Card key={bot.id} padding="sm">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={bot.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-mdb-text truncate">{bot.name}</div>
                    <div className="text-xs text-mdb-text-muted font-mono truncate">{bot.username}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-mdb-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/fleet/bots/${bot.id}`)}
                  >
                    Details
                  </Button>
                  <div>
                    {isOnline ? (
                      <Button variant="danger" size="sm" icon={<Square size={12} />} onClick={() => handleStop(bot.id)}>Stop</Button>
                    ) : (
                      <Button variant="success" size="sm" icon={<Play size={12} />} onClick={() => handleStart(bot.id)}>Start</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
