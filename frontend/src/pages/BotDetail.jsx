import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { StatusBadge, HealthBar, FoodBar } from '../components/ui/StatusComponents';
import { useToast } from '../components/ToastContainer';
import { ArrowLeft, Send, RefreshCw, Scan, Package, Settings, Terminal, Play, Square, AlertTriangle, Box, Truck } from 'lucide-react';
import DeliverModal from '../components/DeliverModal';

const BOT_NAV = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'chests', label: 'Delivery & Chests', icon: Truck },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'logs', label: 'Logs', icon: AlertTriangle },
];

export default function BotDetail() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chests, setChests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState('');
  const [activeTab, setActiveTab] = useState('console');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanConfig, setScanConfig] = useState({ scanRadius: 16, autoRescan: true });
  const [showScanConfig, setShowScanConfig] = useState(false);
  const [orderItem, setOrderItem] = useState('');
  const [orderCount, setOrderCount] = useState(1);
  const [orderPlayer, setOrderPlayer] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [deliverChest, setDeliverChest] = useState(null);
  const [deliveryConfig, setDeliveryConfig] = useState({
    DELIVERY_MODE: 'TPA',
    TARGET_COORD_MODE: 'USER',
    POST_DELIVERY_ACTION: 'FLY_HOME',
    STORAGE_KEYS: { ender: 'ender', chest: 'chest', elytra: 'elytra', rocket: 'rocket' },
    BASE_COORDINATES: { x: 0, y: 64, z: 0 },
    RANDOM_REGION_BOUNDS: { x1: -1000, z1: -1000, x2: 1000, z2: 1000 }
  });
  const [useWebViewer, setUseWebViewer] = useState(true);
  const chatEndRef = useRef(null);
  const { addToast } = useToast();

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
      const [botData, invData, logData, chestData, scanCfg, delivCfg] = await Promise.all([
        api.fleet.getBot(botId),
        api.fleet.getBotInventory(botId),
        api.fleet.getBotLogs(botId),
        api.chests.listForBot(botId).catch(() => []),
        api.chests.getScanConfig(botId).catch(() => ({ scanRadius: 16, autoRescan: true })),
        api.fleet.getDeliveryConfig().catch(() => null),
      ]);
      setBot(botData);
      setInventory(invData);
      setLogs(logData);
      setChests(chestData);
      setScanConfig(scanCfg);
      if (delivCfg) setDeliveryConfig(delivCfg);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load bot data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCommand = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    try {
      await api.fleet.sendCommand(botId, command);
      setChatMessages(prev => [...prev, { sender: 'you', message: command, timestamp: Date.now() }]);
      setCommand('');
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to send command' });
    }
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await api.fleet.sendCommand(botId, `say ${chatInput}`);
      setChatMessages(prev => [...prev, { sender: 'you', message: chatInput, timestamp: Date.now() }]);
      setChatInput('');
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to send message' });
    }
  };

  const handleStart = async () => {
    try { await api.fleet.startBot(botId); loadBotData(); addToast({ type: 'success', title: 'Bot started' }); }
    catch (err) { addToast({ type: 'error', title: 'Failed to start bot' }); }
  };

  const handleStop = async () => {
    try { await api.fleet.stopBot(botId); loadBotData(); addToast({ type: 'success', title: 'Bot stopped' }); }
    catch (err) { addToast({ type: 'error', title: 'Failed to stop bot' }); }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanProgress({ phase: 'Starting...', percent: 0 });
    try {
      await api.chests.triggerScan(botId, scanConfig.scanRadius);
      addToast({ type: 'success', title: 'Scan started' });
      pollScanStatus();
    } catch (err) {
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
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to rescan' });
    }
  };

  const handleSaveScanConfig = async () => {
    try {
      await api.chests.updateScanConfig(botId, scanConfig);
      setShowScanConfig(false);
      addToast({ type: 'success', title: 'Scan config saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save config' });
    }
  };

  const handleSaveDeliveryConfig = async () => {
    try {
      const res = await api.fleet.updateDeliveryConfig(deliveryConfig);
      if (res && res.config) setDeliveryConfig(res.config);
      addToast({ type: 'success', title: 'Delivery configuration saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save delivery config: ' + (err.message || 'Error') });
    }
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!orderItem.trim()) return;
    setOrdering(true);
    try {
      const result = await api.chests.orderItem(botId, orderItem, orderCount, orderPlayer || 'player');
      if (result.success) {
        addToast({ type: 'success', title: 'Order placed: ' + orderItem + ' x' + orderCount });
        setOrderItem('');
        setOrderCount(1);
        setOrderPlayer('');
      } else {
        addToast({ type: 'error', title: result.error || 'Order failed' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Order failed: ' + (err.message || 'Unknown error') });
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-mdb-text-muted">Loading...</div>;
  if (!bot) return (
    <div className="flex flex-col items-center justify-center py-20 text-mdb-text-muted">
      <div className="text-lg font-medium mb-1 text-mdb-text">Bot not found</div>
      <button className="h-10 px-5 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium mt-4" onClick={() => navigate('/fleet/bots')}>Back to Bots</button>
    </div>
  );

  const status = bot.liveStatus?.status || bot.status;
  const isOnline = !['OFFLINE', 'ERROR'].includes(status);

  const renderContent = () => {
    switch (activeTab) {
      case 'console':
        return (
          <div className="max-w-[800px]">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Terminal size={16} /> Live Console
            </h2>
            <div className="h-[300px] overflow-y-auto bg-mdb-bg rounded-xl border border-mdb-border p-4 mb-3 font-mono text-xs space-y-0.5">
              {chatMessages.length === 0 ? (
                <div className="text-mdb-text-muted">No messages yet. Send a command or chat message below.</div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="py-0.5 hover:bg-mdb-surface-high rounded px-1 -mx-1">
                    <span className="text-mdb-text-muted mr-2">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-semibold ${msg.sender === 'you' ? 'text-mdb-primary' : ''}`}>{msg.sender}:</span>
                    {' '}{msg.message}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSend} className="flex gap-2 mb-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something..."
                className="flex-1 font-mono text-sm"
                disabled={!isOnline}
              />
              <button type="submit" className="h-10 px-4 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium inline-flex items-center gap-2 transition-colors" disabled={!isOnline}>
                <Send size={14} />
              </button>
            </form>
            <form onSubmit={handleSendCommand} className="flex gap-2">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="/command"
                className="flex-1 font-mono text-sm"
                disabled={!isOnline}
              />
              <button type="submit" className="h-10 px-4 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:bg-mdb-surface-high inline-flex items-center gap-2 transition-colors" disabled={!isOnline}>
                <Terminal size={14} /> Exec
              </button>
            </form>
          </div>
        );
      case 'chests':
        return (
          <div className="max-w-[800px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Box size={16} /> Chest Scanner
              </h2>
              <div className="flex gap-2">
                <button className="h-8 px-3 rounded-lg border border-mdb-border text-xs font-medium text-mdb-text-secondary hover:bg-mdb-surface-high transition-colors inline-flex items-center gap-1.5" onClick={() => setShowScanConfig(true)}>
                  <Settings size={12} /> Config
                </button>
                <button className="h-8 px-3 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors" onClick={handleScan} disabled={scanning || !isOnline}>
                  <Scan size={12} /> {scanning ? 'Scanning...' : 'Scan'}
                </button>
              </div>
            </div>

            {scanning && scanProgress && (
              <div className="bg-mdb-surface rounded-xl border border-mdb-border p-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-1.5 bg-mdb-surface-high rounded-full overflow-hidden">
                    <div className="h-full bg-mdb-primary rounded-full transition-[width]" style={{ width: `${scanProgress.percent}%` }} />
                  </div>
                  <span className="text-xs text-mdb-text-secondary font-mono min-w-[160px]">{scanProgress.phase} ({scanProgress.percent}%) {scanProgress.found ? `— ${scanProgress.found} found` : ''}</span>
                </div>
              </div>
            )}

            {chests.length === 0 ? (
              <div className="py-16 text-center text-mdb-text-muted">
                <div className="text-base font-medium mb-1 text-mdb-text">No chests found</div>
                <div className="text-sm">Run a scan to discover chests</div>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {chests.map((chest, i) => (
                  <div key={i} className="flex items-center justify-between py-3 px-4 bg-mdb-surface rounded-xl border border-mdb-border stagger-item">
                    <div>
                      <div className="text-sm font-medium">{chest.name}</div>
                      <div className="text-xs text-mdb-text-muted font-mono">{chest.x}, {chest.y}, {chest.z}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm">{chest.itemName}</div>
                        {chest.itemCount !== undefined && <div className="text-xs text-mdb-text-muted">{chest.itemCount} items</div>}
                      </div>
                      <button className="h-8 px-3 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors" onClick={() => setDeliverChest(chest)}>
                        <Send size={12} /> Deliver
                      </button>
                      <button className="h-8 w-8 rounded-lg border border-mdb-border text-mdb-text-muted hover:text-mdb-primary hover:border-mdb-primary/30 flex items-center justify-center transition-colors" onClick={() => handleRescan(chest.x, chest.y, chest.z)}>
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Package size={16} /> Order Item
            </h3>
            <form onSubmit={handleOrder} className="p-4 bg-mdb-surface rounded-xl border border-mdb-border space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Item name (e.g. diamond_sword)" value={orderItem} onChange={(e) => setOrderItem(e.target.value)} disabled={ordering} />
                <input type="number" placeholder="Qty" value={orderCount} onChange={(e) => setOrderCount(parseInt(e.target.value) || 1)} min={1} max={64} disabled={ordering} />
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="Player name (for tpa)" value={orderPlayer} onChange={(e) => setOrderPlayer(e.target.value)} className="flex-1" disabled={ordering} />
                <button type="submit" className="h-10 px-5 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium transition-colors" disabled={ordering || !orderItem.trim()}>
                  {ordering ? 'Ordering...' : 'Order'}
                </button>
              </div>
            </form>

            <div className="my-6 border-t border-mdb-border" />

            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Truck size={16} /> Delivery Engine Settings
            </h3>
            <div className="bg-mdb-surface rounded-xl border border-mdb-border p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Delivery Transport Mode</label>
                  <select value={deliveryConfig.DELIVERY_MODE} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, DELIVERY_MODE: e.target.value })}>
                    <option value="TPA">TPA (Teleport Request)</option>
                    <option value="ELYTRA">ELYTRA (Autonomous Flight)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Target Coords Mode</label>
                  <select value={deliveryConfig.TARGET_COORD_MODE} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, TARGET_COORD_MODE: e.target.value })}>
                    <option value="USER">USER (Direct Coordinates)</option>
                    <option value="RANDOM_REGION">RANDOM_REGION (Bounded Region)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Post-Delivery Action Waterfall</label>
                <select value={deliveryConfig.POST_DELIVERY_ACTION} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, POST_DELIVERY_ACTION: e.target.value })}>
                  <option value="FLY_HOME">FLY_HOME (Fly back to base coordinates)</option>
                  <option value="ECHEST_SAVE_AND_DIE">ECHEST_SAVE_AND_DIE (Stash flight gear in EChest then suicide)</option>
                  <option value="DIRECT_DIE">DIRECT_DIE (Skip stashing, immediate suicide)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Key: Ender Chest</label>
                  <input type="text" value={deliveryConfig.STORAGE_KEYS?.ender || 'ender'} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, ender: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Key: Standard Chest</label>
                  <input type="text" value={deliveryConfig.STORAGE_KEYS?.chest || 'chest'} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, chest: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Key: Elytra</label>
                  <input type="text" value={deliveryConfig.STORAGE_KEYS?.elytra || 'elytra'} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, elytra: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Key: Rockets</label>
                  <input type="text" value={deliveryConfig.STORAGE_KEYS?.rocket || 'rocket'} onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, rocket: e.target.value } })} />
                </div>
              </div>

              <button className="h-9 px-4 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-xs font-medium inline-flex items-center gap-2 transition-colors" onClick={handleSaveDeliveryConfig}>
                Save Delivery Settings
              </button>
            </div>

            {showScanConfig && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-end animate-fade-in" onClick={() => setShowScanConfig(false)}>
                <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-border flex flex-col overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-mdb-border">
                    <h2 className="text-lg font-semibold">Scan Configuration</h2>
                    <button className="h-8 w-8 rounded-lg hover:bg-mdb-surface-high flex items-center justify-center text-mdb-text-muted hover:text-mdb-text transition-colors" onClick={() => setShowScanConfig(false)}>
                      <AlertTriangle size={16} />
                    </button>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Scan Radius (blocks)</label>
                      <input type="number" value={scanConfig.scanRadius} onChange={(e) => setScanConfig({...scanConfig, scanRadius: parseInt(e.target.value) || 16})} min={8} max={128} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Auto-rescan after delivery</label>
                      <select value={scanConfig.autoRescan ? 'true' : 'false'} onChange={(e) => setScanConfig({...scanConfig, autoRescan: e.target.value === 'true'})}>
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-mdb-border">
                      <button className="flex-1 h-10 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:bg-mdb-surface-high transition-colors" onClick={() => setShowScanConfig(false)}>Cancel</button>
                      <button className="flex-1 h-10 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium transition-colors" onClick={handleSaveScanConfig}>Save</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'inventory':
        return (
          <div className="max-w-[800px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Package size={16} /> Inventory ({inventory.length} items)
              </h2>
              <button
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${useWebViewer ? 'bg-mdb-primary text-white' : 'border border-mdb-border text-mdb-text-secondary hover:bg-mdb-surface-high'}`}
                onClick={() => setUseWebViewer(!useWebViewer)}
              >
                {useWebViewer ? 'Mineflayer Web Viewer' : 'Grid View'}
              </button>
            </div>

            {useWebViewer ? (
              <div className="w-full h-[520px] rounded-xl border border-mdb-border overflow-hidden">
                <iframe
                  src={`http://${window.location.hostname}:3001`}
                  title="Mineflayer Live Web Inventory"
                  style={{ width: '100%', height: '100%', border: 'none', background: '#141313' }}
                />
              </div>
            ) : (
              <div className="inventory-grid">
                {Array.from({ length: 36 }, (_, i) => {
                  const item = inventory.find(inv => inv.slot === i);
                  return (
                    <div key={i} className={`inventory-slot aspect-square bg-mdb-bg flex items-center justify-center flex-col p-0.5 min-h-[40px] ${item ? '' : 'empty'}`}>
                      {item && (
                        <>
                          <span className="font-mono text-[9px] text-mdb-text-muted text-center overflow-hidden text-ellipsis whitespace-nowrap w-full">{item.name}</span>
                          {item.count > 1 && <span className="font-mono text-[11px] font-bold text-mdb-text">{item.count}</span>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-[800px] space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Settings size={16} /> Bot Settings
            </h2>

            <div className="bg-mdb-surface rounded-xl border border-mdb-border p-5">
              <h3 className="text-sm font-medium mb-4 pb-3 border-b border-mdb-border">Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Bot Name</label>
                  <input type="text" value={bot.name} readOnly className="text-mdb-text-muted" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Username</label>
                  <input type="text" value={bot.username} readOnly className="text-mdb-text-muted" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Swarm</label>
                  <input type="text" value={bot.swarmId || 'None'} readOnly className="text-mdb-text-muted" />
                </div>
              </div>
            </div>

            <div className="bg-mdb-surface rounded-xl border border-mdb-border p-5">
              <h3 className="text-sm font-medium mb-4 pb-3 border-b border-mdb-border">Server Connection</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Server IP / Host</label>
                  <input type="text" value={bot.serverHost || ''} readOnly className="text-mdb-text-muted" placeholder="Not configured" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Port</label>
                    <input type="text" value={bot.serverPort || 25565} readOnly className="text-mdb-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Version</label>
                    <input type="text" value={bot.serverVersion || 'auto'} readOnly className="text-mdb-text-muted" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Auth Mode</label>
                  <input type="text" value={bot.authMode === 'OFFLINE' ? 'Offline (Cracked)' : 'Online (Premium)'} readOnly className="text-mdb-text-muted" />
                </div>
              </div>
            </div>

            <div className="bg-mdb-surface rounded-xl border border-mdb-border p-5">
              <h3 className="text-sm font-medium mb-4 pb-3 border-b border-mdb-border">Scan Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Scan Radius</label>
                  <input type="number" value={scanConfig.scanRadius} onChange={(e) => setScanConfig({...scanConfig, scanRadius: parseInt(e.target.value) || 16})} min={8} max={128} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Auto-rescan</label>
                  <select value={scanConfig.autoRescan ? 'true' : 'false'} onChange={(e) => setScanConfig({...scanConfig, autoRescan: e.target.value === 'true'})}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <button className="h-10 px-5 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium transition-colors" onClick={handleSaveScanConfig}>Save Scan Settings</button>
              </div>
            </div>

            <div className="bg-mdb-surface rounded-xl border border-mdb-border p-5">
              <h3 className="text-sm font-medium mb-4 pb-3 border-b border-mdb-border">Danger Zone</h3>
              <button className="h-10 px-5 rounded-lg border border-red-400/30 text-red-400 text-sm font-medium inline-flex items-center gap-2 hover:bg-red-400/10 transition-colors" onClick={handleStop} disabled={!isOnline}>
                <Square size={14} /> Force Stop Bot
              </button>
            </div>
          </div>
        );
      case 'logs':
        return (
          <div className="max-w-[800px]">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={16} /> Logs ({logs.length})
            </h2>
            <div className="max-h-[500px] overflow-y-auto bg-mdb-bg rounded-xl border border-mdb-border p-3 font-mono text-xs space-y-0.5">
              {logs.length === 0 ? (
                <div className="text-mdb-text-muted py-8 text-center">No logs available</div>
              ) : (
                logs.slice(0, 100).map((log, i) => (
                  <div key={i} className="py-0.5 hover:bg-mdb-surface-high rounded px-1 -mx-1">
                    <span className="text-mdb-text-muted mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full gap-0">
      {/* Desktop Sidebar */}
      <div className="w-[280px] bg-mdb-surface border-r border-mdb-border flex flex-col shrink-0 max-md:hidden">
        <div className="flex items-center gap-2 p-4 border-b border-mdb-border">
          <button className="h-8 w-8 rounded-lg hover:bg-mdb-surface-high flex items-center justify-center text-mdb-text-muted hover:text-mdb-text transition-colors" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{bot.name}</div>
            <div className="font-mono text-xs text-mdb-text-muted">{bot.username}</div>
          </div>
        </div>
        <div className="flex items-center justify-between py-2.5 px-4 border-b border-mdb-border">
          <StatusBadge status={status} />
          {isOnline ? (
            <button className="h-7 px-2.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium inline-flex items-center gap-1 hover:bg-red-500/20 transition-colors" onClick={handleStop}><Square size={12} /> Stop</button>
          ) : (
            <button className="h-7 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium inline-flex items-center gap-1 hover:bg-emerald-500/20 transition-colors" onClick={handleStart}><Play size={12} /> Start</button>
          )}
        </div>
        {isOnline && (
          <div className="py-2.5 px-4 border-b border-mdb-border space-y-1.5">
            {bot.liveStatus?.health != null && (
              <HealthBar value={bot.liveStatus.health} />
            )}
            {bot.liveStatus?.food != null && (
              <FoodBar value={bot.liveStatus.food} />
            )}
            {bot.liveStatus?.position && (
              <div className="text-xs text-mdb-text-muted font-mono">
                {Math.round(bot.liveStatus.position.x)}, {Math.round(bot.liveStatus.position.y)}, {Math.round(bot.liveStatus.position.z)}
              </div>
            )}
          </div>
        )}
        <nav className="flex-1 py-2 overflow-y-auto">
          {BOT_NAV.map(({ id, label, icon: Icon }) => (
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
              {id === 'chests' && chests.length > 0 && (
                <span className="ml-auto bg-mdb-primary/10 text-mdb-primary text-[10px] font-mono px-1.5 py-0.5 rounded-full">{chests.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="py-2 px-4 border-t border-mdb-border">
          <button className="h-8 w-full rounded-lg hover:bg-mdb-surface-high text-xs font-medium text-mdb-text-secondary hover:text-mdb-text inline-flex items-center justify-center gap-1.5 transition-colors" onClick={loadBotData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
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

      {/* Mobile Bottom Tab Bar */}
      <div className="hidden max-md:flex fixed bottom-0 left-0 right-0 h-14 bg-mdb-surface border-t border-mdb-border z-50 items-center justify-around">
        {BOT_NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[52px] text-[10px] transition-colors relative ${
              activeTab === id ? 'text-mdb-primary' : 'text-mdb-text-muted'
            }`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {activeTab === id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-mdb-primary rounded-full" />}
          </button>
        ))}
      </div>
    </div>
  );
}
