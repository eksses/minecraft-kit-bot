import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { useToast } from '../components/ToastContainer';
import { ArrowLeft, Send, RefreshCw, Scan, Package, Settings, Terminal, Play, Square, ChevronDown, ChevronRight, Box, Trash2, Shield } from 'lucide-react';
import { Button, Card, CardHeader, Input, Select, Tabs, TabPanel, EmptyState, LoadingState, IconButton, Modal, Progress, Toggle, StatusBadge } from '../components/ui';
import DeliverModal from '../components/DeliverModal';

const TAB_ITEMS = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'delivery', label: 'Delivery', icon: Box },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'whitelist', label: 'Whitelist', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function BotDetail() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [chests, setChests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('console');
  const [chatMessages, setChatMessages] = useState([]);
  const chatEndRef = useRef(null);
  const { addToast } = useToast();

  // Console
  const [consoleMode, setConsoleMode] = useState('chat');
  const [consoleInput, setConsoleInput] = useState('');

  // Delivery
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [deliverChest, setDeliverChest] = useState(null);

  // Settings - scan
  const [scanConfig, setScanConfig] = useState({ scanRadius: 16, autoRescan: true });
  const [savingScan, setSavingScan] = useState(false);

  // Settings - delivery
  const [deliveryConfig, setDeliveryConfig] = useState({
    DELIVERY_MODE: 'TPA',
    TARGET_COORD_MODE: 'USER',
    POST_DELIVERY_ACTION: 'FLY_HOME',
    STORAGE_KEYS: { ender: 'ender', chest: 'chest', elytra: 'elytra', rocket: 'rocket' },
    BASE_COORDINATES: { x: 0, y: 64, z: 0 },
    RANDOM_REGION_BOUNDS: { x1: -1000, z1: -1000, x2: 1000, z2: 1000 }
  });
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [showDeliveryAdvanced, setShowDeliveryAdvanced] = useState(false);

  useEffect(() => {
    if (botId) loadBotData();
  }, [botId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!botId) return;
    const unsub = api.realtime.on('chat', (msg) => {
      if (msg.botId === botId) {
        setChatMessages(prev => [...prev.slice(-100), { ...msg, timestamp: Date.now() }]);
      }
    });
    return unsub;
  }, [botId]);

  const loadBotData = async () => {
    try {
      const [botData, invData, chestData, scanCfg, delivCfg] = await Promise.all([
        api.fleet.getBot(botId),
        api.fleet.getBotInventory(botId),
        api.chests.listForBot(botId).catch(() => []),
        api.chests.getScanConfig(botId).catch(() => ({ scanRadius: 16, autoRescan: true })),
        api.fleet.getDeliveryConfig().catch(() => null),
      ]);
      setBot(botData);
      setInventory(invData);
      setChests(chestData);
      setScanConfig(scanCfg);
      if (delivCfg) setDeliveryConfig(delivCfg);
    } catch {
      addToast({ type: 'error', title: 'Failed to load bot data' });
    } finally {
      setLoading(false);
    }
  };

  const handleConsoleSubmit = async (e) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;
    try {
      const cmd = consoleMode === 'command' ? consoleInput : `say ${consoleInput}`;
      await api.fleet.sendCommand(botId, cmd);
      setChatMessages(prev => [...prev, { sender: 'you', message: consoleInput, mode: consoleMode, timestamp: Date.now() }]);
      setConsoleInput('');
    } catch {
      addToast({ type: 'error', title: 'Failed to send' });
    }
  };

  const handleStart = async () => {
    try { await api.fleet.startBot(botId); loadBotData(); addToast({ type: 'success', title: 'Bot started' }); }
    catch { addToast({ type: 'error', title: 'Failed to start bot' }); }
  };

  const handleStop = async () => {
    try { await api.fleet.stopBot(botId); loadBotData(); addToast({ type: 'success', title: 'Bot stopped' }); }
    catch { addToast({ type: 'error', title: 'Failed to stop bot' }); }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanProgress({ phase: 'Starting...', percent: 0 });
    try {
      await api.chests.triggerScan(botId, scanConfig.scanRadius);
      addToast({ type: 'success', title: 'Scan started' });
      pollScanStatus();
    } catch {
      addToast({ type: 'error', title: 'Failed to start scan' });
      setScanning(false);
      setScanProgress(null);
    }
  };

  const pollScanStatus = async () => {
    const poll = async () => {
      try {
        const status = await api.chests.getScanStatus(botId);
        setScanProgress({ phase: status.phase, percent: status.percent || 0, found: status.found });
        if (status.running) {
          setTimeout(poll, 1000);
        } else {
          setScanning(false);
          loadBotData();
        }
      } catch {
        setScanning(false);
        setScanProgress(null);
      }
    };
    poll();
  };

  const handleRescan = async (x, y, z) => {
    try {
      await api.chests.rescanChest(botId, x, y, z);
      addToast({ type: 'success', title: 'Rescan triggered' });
      loadBotData();
    } catch {
      addToast({ type: 'error', title: 'Failed to rescan' });
    }
  };

  const handleSaveScanConfig = async () => {
    setSavingScan(true);
    try {
      await api.chests.updateScanConfig(botId, scanConfig);
      addToast({ type: 'success', title: 'Scan config saved' });
    } catch {
      addToast({ type: 'error', title: 'Failed to save config' });
    } finally {
      setSavingScan(false);
    }
  };

  const handleSaveDeliveryConfig = async () => {
    setSavingDelivery(true);
    try {
      const res = await api.fleet.updateDeliveryConfig(deliveryConfig);
      if (res?.config) setDeliveryConfig(res.config);
      addToast({ type: 'success', title: 'Delivery config saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save: ' + (err.message || 'Error') });
    } finally {
      setSavingDelivery(false);
    }
  };

  if (loading) return <LoadingState text="Loading bot..." className="p-12" />;
  if (!bot) {
    return (
      <EmptyState
        title="Bot not found"
        description="This bot may have been deleted."
        action={<Button onClick={() => navigate('/fleet/bots')}>Back to Bots</Button>}
      />
    );
  }

  const status = bot.liveStatus?.status || bot.status;
  const isOnline = !['OFFLINE', 'ERROR'].includes(status);

  const renderConsole = () => (
    <div className="flex flex-col flex-1 min-h-0 max-w-[800px]">
      <div className="flex-1 overflow-y-auto bg-mdb-bg rounded-xl border border-mdb-border p-4 mb-3 font-mono text-xs space-y-0.5 min-h-[200px]">
        {chatMessages.length === 0 ? (
          <div className="text-mdb-text-muted py-8 text-center">No messages yet. Send a message or command below.</div>
        ) : (
          chatMessages.map((msg, i) => (
            <div key={i} className="py-0.5 hover:bg-mdb-surface-high rounded px-1 -mx-1">
              <span className="text-mdb-text-muted mr-2">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
              <span className={`font-semibold ${msg.sender === 'you' ? 'text-mdb-primary' : ''}`}>{msg.sender}:</span>
              {msg.mode === 'command' && <span className="text-amber-400 mr-1">/</span>}
              {' '}{msg.message}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleConsoleSubmit} className="flex gap-2 items-center shrink-0">
        <Button
          type="button"
          variant={consoleMode === 'command' ? 'success' : 'primary'}
          size="sm"
          onClick={() => setConsoleMode(m => m === 'chat' ? 'command' : 'chat')}
          className="shrink-0 font-mono"
        >
          {consoleMode === 'chat' ? 'Say' : '/'}
        </Button>
        <Input
          value={consoleInput}
          onChange={(e) => setConsoleInput(e.target.value)}
          placeholder={consoleMode === 'chat' ? 'Say something...' : '/command args...'}
          className="flex-1"
          disabled={!isOnline}
        />
        <Button type="submit" disabled={!isOnline || !consoleInput.trim()} icon={Send} />
        {chatMessages.length > 0 && (
          <IconButton icon={Trash2} size="sm" onClick={() => setChatMessages([])} tooltip="Clear messages" />
        )}
      </form>
    </div>
  );

  const renderDelivery = () => (
    <div className="max-w-[800px] space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Box size={16} /> Chests ({chests.length})
        </h2>
        <Button size="sm" icon={Scan} onClick={handleScan} disabled={scanning || !isOnline} loading={scanning}>
          {scanning ? 'Scanning...' : 'Scan'}
        </Button>
      </div>

      {scanning && scanProgress && (
        <Card padding="sm">
          <Progress
            value={scanProgress.percent}
            label={scanProgress.phase}
            showValue
          />
          {scanProgress.found != null && (
            <p className="text-xs text-mdb-text-muted mt-2">{scanProgress.found} chests found</p>
          )}
        </Card>
      )}

      {chests.length === 0 ? (
        <EmptyState
          icon={Box}
          title="No chests found"
          description="Run a scan to discover nearby chests."
          action={isOnline ? <Button icon={Scan} onClick={handleScan} disabled={scanning}>Scan Now</Button> : null}
        />
      ) : (
        <div className="space-y-2">
          {chests.map((chest, i) => (
            <Card key={i} padding="sm" className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{chest.name}</div>
                <div className="text-xs text-mdb-text-muted font-mono">
                  {chest.x}, {chest.y}, {chest.z}
                  {chest.itemName && <span className="ml-2 text-mdb-text-secondary">{chest.itemName}{chest.itemCount != null ? ` x${chest.itemCount}` : ''}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Button size="sm" icon={Send} onClick={() => setDeliverChest(chest)} disabled={!isOnline}>
                  Deliver
                </Button>
                <IconButton icon={RefreshCw} size="sm" onClick={() => handleRescan(chest.x, chest.y, chest.z)} tooltip="Rescan" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="max-w-[800px]">
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <Package size={16} /> Inventory ({inventory.length} items)
      </h2>
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-9 gap-px bg-mdb-border rounded-xl border border-mdb-border overflow-hidden min-w-[460px]">
          {Array.from({ length: 36 }, (_, i) => {
            const item = inventory.find(inv => inv.slot === i);
            return (
              <div key={i} className={`aspect-square bg-mdb-bg flex items-center justify-center flex-col p-0.5 min-h-[44px] ${item ? 'bg-mdb-surface' : ''}`}>
                {item ? (
                  <>
                    <span className="font-mono text-[9px] text-mdb-text-muted text-center overflow-hidden text-ellipsis whitespace-nowrap w-full">{item.name}</span>
                    {item.count > 1 && <span className="font-mono text-[11px] font-bold text-mdb-text">{item.count}</span>}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  // Whitelist
  const [whitelist, setWhitelist] = useState([]);
  const [showAddWhitelist, setShowAddWhitelist] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [whitelistForm, setWhitelistForm] = useState({ playerName: '', role: 'user' });

  const loadWhitelist = async () => {
    try {
      const data = await api.fleet.getWhitelist();
      setWhitelist(data || []);
    } catch (_) {}
  };

  useEffect(() => {
    loadWhitelist();
  }, []);

  const handleAddWhitelist = async (e) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await api.fleet.updateWhitelist(editingPlayer.playerName, { role: whitelistForm.role });
        addToast({ type: 'success', title: 'Player role updated' });
      } else {
        await api.fleet.addWhitelist(whitelistForm);
        addToast({ type: 'success', title: 'Player added to whitelist' });
      }
      setShowAddWhitelist(false);
      setEditingPlayer(null);
      setWhitelistForm({ playerName: '', role: 'user' });
      loadWhitelist();
    } catch (err) {
      addToast({ type: 'error', title: err.error || 'Failed to save whitelist player' });
    }
  };

  const handleDeleteWhitelist = async (playerName) => {
    if (!confirm(`Remove ${playerName} from whitelist?`)) return;
    try {
      await api.fleet.deleteWhitelist(playerName);
      loadWhitelist();
      addToast({ type: 'success', title: 'Player removed from whitelist' });
    } catch (_) {
      addToast({ type: 'error', title: 'Failed to remove player' });
    }
  };

  const renderWhitelist = () => (
    <div className="max-w-[800px] space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Shield size={16} /> Whitelist ({whitelist.length})
        </h2>
        <Button size="sm" icon={Plus} onClick={() => { setEditingPlayer(null); setWhitelistForm({ playerName: '', role: 'user' }); setShowAddWhitelist(true); }}>
          Add Player
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-4 h-9 border-b border-mdb-border">Username</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-4 h-9 border-b border-mdb-border">Role</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted text-left px-4 h-9 border-b border-mdb-border">Added By</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted border-b border-mdb-border"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mdb-border">
              {whitelist.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-mdb-text-muted">
                    No players whitelisted. Click "Add Player" above to grant access.
                  </td>
                </tr>
              ) : (
                whitelist.map((p) => (
                  <tr key={p.id || p.playerName} className="hover:bg-mdb-surface-high transition-colors">
                    <td className="font-medium px-4 h-11 text-sm text-mdb-text">{p.playerName}</td>
                    <td className="px-4 h-11 text-sm">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        p.role === 'admin'
                          ? 'bg-mdb-primary/15 text-mdb-primary'
                          : p.role === 'vip'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-mdb-surface-high text-mdb-text-muted'
                      }`}>
                        {p.role ? p.role.toUpperCase() : 'USER'}
                      </span>
                    </td>
                    <td className="text-mdb-text-muted text-sm px-4 h-11">{p.addedBy || 'system'}</td>
                    <td className="text-right px-4 h-11 space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => { setEditingPlayer(p); setWhitelistForm({ playerName: p.playerName, role: p.role }); setShowAddWhitelist(true); }}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteWhitelist(p.playerName)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showAddWhitelist} onClose={() => { setShowAddWhitelist(false); setEditingPlayer(null); }} title={editingPlayer ? `Edit Role: ${editingPlayer.playerName}` : 'Add Player to Whitelist'} size="sm">
        <form onSubmit={handleAddWhitelist} className="space-y-4">
          <Input
            label="Minecraft Username"
            value={whitelistForm.playerName}
            onChange={(e) => setWhitelistForm({ ...whitelistForm, playerName: e.target.value })}
            placeholder="e.g. FitMC"
            disabled={!!editingPlayer}
            required
          />
          <Select
            label="In-Game Role"
            value={whitelistForm.role}
            onChange={(e) => setWhitelistForm({ ...whitelistForm, role: e.target.value })}
            options={[
              { value: 'user', label: 'User (Standard kit orders)' },
              { value: 'vip', label: 'VIP (Priority kit orders)' },
              { value: 'admin', label: 'Admin (In-game whitelist control)' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setShowAddWhitelist(false); setEditingPlayer(null); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingPlayer ? 'Save Role' : 'Add to Whitelist'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-[800px] space-y-6">
      <SettingsSection title="Scan Config" defaultOpen>
        <div className="space-y-4">
          <Input
            label="Scan Radius (blocks)"
            type="number"
            value={scanConfig.scanRadius}
            onChange={(e) => setScanConfig({ ...scanConfig, scanRadius: parseInt(e.target.value) || 16 })}
            min={8} max={128}
          />
          <Toggle
            checked={scanConfig.autoRescan}
            onChange={(v) => setScanConfig({ ...scanConfig, autoRescan: v })}
            label="Auto-rescan after delivery"
          />
          <Button onClick={handleSaveScanConfig} loading={savingScan}>Save Scan Config</Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Delivery Config" defaultOpen={false}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Transport Mode"
              value={deliveryConfig.DELIVERY_MODE}
              onChange={(e) => setDeliveryConfig({ ...deliveryConfig, DELIVERY_MODE: e.target.value })}
              options={[
                { value: 'TPA', label: 'TPA (Teleport Request)' },
                { value: 'ELYTRA', label: 'ELYTRA (Autonomous Flight)' },
              ]}
            />
            <Select
              label="Target Coords Mode"
              value={deliveryConfig.TARGET_COORD_MODE}
              onChange={(e) => setDeliveryConfig({ ...deliveryConfig, TARGET_COORD_MODE: e.target.value })}
              options={[
                { value: 'USER', label: 'USER (Direct Coordinates)' },
                { value: 'RANDOM_REGION', label: 'RANDOM_REGION (Bounded Region)' },
              ]}
            />
          </div>

          <Toggle
            checked={!!deliveryConfig.WHITELIST_ENABLED}
            onChange={(v) => setDeliveryConfig({ ...deliveryConfig, WHITELIST_ENABLED: v })}
            label="Enforce In-Game Whitelist for Ordering"
          />

          <Select
            label="Post-Delivery Action"
            value={deliveryConfig.POST_DELIVERY_ACTION}
            onChange={(e) => setDeliveryConfig({ ...deliveryConfig, POST_DELIVERY_ACTION: e.target.value })}
            options={[
              { value: 'FLY_HOME', label: 'Fly home to base' },
              { value: 'ECHEST_SAVE_AND_DIE', label: 'Stash gear in EChest then die' },
              { value: 'DIRECT_DIE', label: 'Immediate respawn (skip stash)' },
            ]}
          />

          <Button
            variant="ghost"
            size="sm"
            icon={showDeliveryAdvanced ? ChevronDown : ChevronRight}
            onClick={() => setShowDeliveryAdvanced(!showDeliveryAdvanced)}
            className="px-0"
          >
            Advanced
          </Button>

          {showDeliveryAdvanced && (
            <div className="space-y-3 pl-1">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Key: Ender Chest" value={deliveryConfig.STORAGE_KEYS?.ender || 'ender'} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, ender: e.target.value } })} />
                <Input label="Key: Chest" value={deliveryConfig.STORAGE_KEYS?.chest || 'chest'} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, chest: e.target.value } })} />
                <Input label="Key: Elytra" value={deliveryConfig.STORAGE_KEYS?.elytra || 'elytra'} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, elytra: e.target.value } })} />
                <Input label="Key: Rockets" value={deliveryConfig.STORAGE_KEYS?.rocket || 'rocket'} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, rocket: e.target.value } })} />
              </div>
            </div>
          )}

          <Button onClick={handleSaveDeliveryConfig} loading={savingDelivery}>Save Delivery Config</Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Danger Zone" variant="danger" defaultOpen>
        <div className="space-y-3">
          <p className="text-xs text-mdb-text-muted">Force-stop or restart the bot. Use only when the bot is stuck.</p>
          <div className="flex gap-2">
            <Button variant="danger" icon={Square} onClick={handleStop} disabled={!isOnline}>Force Stop</Button>
            <Button variant="secondary" icon={RefreshCw} onClick={async () => { await handleStop(); setTimeout(handleStart, 1000); }} disabled={!isOnline}>Restart</Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );

  return (
    <div className="flex h-full gap-0">
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-mdb-surface/95 backdrop-blur-md border-b border-mdb-border flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <IconButton icon={ArrowLeft} size="sm" onClick={() => navigate('/fleet/bots')} tooltip="Back to Bots" />
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate text-mdb-text">{bot.name}</div>
            <div className="font-mono text-[10px] text-mdb-text-muted truncate">{bot.username}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} />
          {isOnline ? (
            <Button size="sm" variant="danger" icon={Square} onClick={handleStop} />
          ) : (
            <Button size="sm" variant="success" icon={Play} onClick={handleStart} />
          )}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="w-[280px] bg-mdb-surface border-r border-mdb-border flex flex-col shrink-0 max-md:hidden">
        <div className="flex items-center gap-2 p-4 border-b border-mdb-border">
          <IconButton icon={ArrowLeft} size="sm" onClick={() => navigate('/fleet/bots')} tooltip="Back" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{bot.name}</div>
            <div className="font-mono text-xs text-mdb-text-muted">{bot.username}</div>
          </div>
        </div>
        <div className="flex items-center justify-between py-2.5 px-4 border-b border-mdb-border">
          <StatusBadge status={status} />
          {isOnline ? (
            <Button size="sm" variant="danger" icon={Square} onClick={handleStop}>Stop</Button>
          ) : (
            <Button size="sm" variant="success" icon={Play} onClick={handleStart}>Start</Button>
          )}
        </div>
        {isOnline && (
          <div className="py-2.5 px-4 border-b border-mdb-border space-y-1.5">
            {bot.liveStatus?.health != null && <HealthBar value={bot.liveStatus.health} />}
            {bot.liveStatus?.food != null && <FoodBar value={bot.liveStatus.food} />}
            {bot.liveStatus?.position && (
              <div className="text-xs text-mdb-text-muted font-mono">
                {Math.round(bot.liveStatus.position.x)}, {Math.round(bot.liveStatus.position.y)}, {Math.round(bot.liveStatus.position.z)}
              </div>
            )}
          </div>
        )}
        <nav className="flex-1 py-2 overflow-y-auto">
          {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`flex items-center gap-2.5 w-full py-2 px-4 text-sm transition-colors ${
                activeTab === id
                  ? 'bg-mdb-surface-high text-mdb-primary font-medium'
                  : 'text-mdb-text-muted hover:text-mdb-text hover:bg-mdb-surface-high'
              }`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
              {id === 'delivery' && chests.length > 0 && (
                <span className="ml-auto bg-mdb-primary/10 text-mdb-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full">{chests.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="py-2 px-4 border-t border-mdb-border">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadBotData} className="w-full">Refresh</Button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 ${activeTab === 'console' ? 'flex flex-col min-h-0 overflow-hidden' : 'overflow-y-auto'} p-4 md:p-6 pb-32 max-md:pb-36 md:pb-10 pt-16 md:pt-6`}>
        {/* Mobile Tabs Segmented Nav */}
        <div className="md:hidden mb-4 bg-mdb-bg/95 backdrop-blur-md py-1 border-b border-mdb-border shrink-0">
          <Tabs items={TAB_ITEMS} value={activeTab} onChange={setActiveTab} variant="segmented" />
        </div>

        {activeTab === 'console' && renderConsole()}
        {activeTab === 'delivery' && renderDelivery()}
        {activeTab === 'inventory' && renderInventory()}
        {activeTab === 'whitelist' && renderWhitelist()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {deliverChest && (
        <DeliverModal
          isOpen={!!deliverChest}
          onClose={() => setDeliverChest(null)}
          botId={botId}
          chestName={deliverChest.name}
          onDeliverSuccess={loadBotData}
        />
      )}
    </div>
  );
}

/* Collapsible settings section */
function SettingsSection({ title, variant = 'default', defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const isDanger = variant === 'danger';

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full px-5 py-4 text-left ${open ? 'border-b border-mdb-border' : ''}`}
      >
        <h3 className={`text-sm font-semibold ${isDanger ? 'text-mdb-error' : 'text-mdb-text'}`}>{title}</h3>
        {open ? <ChevronDown size={16} className="text-mdb-text-muted" /> : <ChevronRight size={16} className="text-mdb-text-muted" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </Card>
  );
}
