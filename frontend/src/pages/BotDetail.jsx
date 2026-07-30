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
    <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
      <div className="text-lg font-semibold mb-2">Bot not found</div>
      <button className="inline-flex items-center gap-2 px-5 h-12 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-4" onClick={() => navigate('/fleet/bots')}>Back to Bots</button>
    </div>
  );

  const status = bot.liveStatus?.status || bot.status;
  const isOnline = !['OFFLINE', 'ERROR'].includes(status);

  const renderContent = () => {
    switch (activeTab) {
      case 'console':
        return (
          <div className="max-w-[800px]">
            <div className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-mdb-outline-variant">
              <Terminal size={18} />
              <span>Live Console</span>
            </div>
            <div className="h-[300px] overflow-y-auto border border-mdb-outline-variant p-4 bg-mdb-surface mb-2">
              {chatMessages.length === 0 ? (
                <div className="text-mdb-text-muted text-sm">No messages yet. Send a command or chat message below.</div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="chat-line font-mono text-xs leading-relaxed text-mdb-text-secondary py-0.5 border-b border-mdb-outline-variant hover:bg-mdb-surface-high">
                    <span className="text-mdb-text-muted mr-2">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-bold ${msg.sender === 'you' ? 'text-mdb-primary' : ''}`}>{msg.sender}:</span>
                    {msg.message}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSend} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something..."
                className="flex-1 font-mono text-[13px]"
                disabled={!isOnline}
              />
              <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary" disabled={!isOnline}>
                <Send size={16} />
              </button>
            </form>
            <form onSubmit={handleSendCommand} className="flex gap-2 mt-2">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="/command"
                className="flex-1 font-mono text-[13px]"
                disabled={!isOnline}
              />
              <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" disabled={!isOnline}>
                <Terminal size={16} /> Exec
              </button>
            </form>
          </div>
        );
      case 'chests':
        return (
          <div className="max-w-[800px]">
            <div className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-mdb-outline-variant">
              <Box size={18} />
              <span>Chest Scanner</span>
              <div className="flex gap-2 ml-auto">
                <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => setShowScanConfig(true)}>
                  <Settings size={14} /> Config
                </button>
                <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-primary text-mdb-on-primary" onClick={handleScan} disabled={scanning || !isOnline}>
                  <Scan size={14} /> {scanning ? 'Scanning...' : 'Scan'}
                </button>
              </div>
            </div>
            {scanning && scanProgress && (
              <div className="bg-mdb-surface border border-mdb-surface-high p-4 mb-6 flex items-center gap-4">
                <div className="flex-1 h-1.5 bg-mdb-surface-high overflow-hidden">
                  <div className="scan-progress-fill h-full bg-mdb-working transition-[width]" style={{ width: `${scanProgress.percent}%` }} />
                </div>
                <span className="text-[13px] text-mdb-text-secondary min-w-[140px] font-mono">{scanProgress.phase} ({scanProgress.percent}%) {scanProgress.found ? `- ${scanProgress.found} found` : ''}</span>
              </div>
            )}
            {chests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center animate-fade-in">
                <div className="text-base font-semibold mb-2">No chests found</div>
                <div className="text-sm mb-4">Run a scan to discover chests</div>
              </div>
            ) : (
              chests.map((chest, i) => (
                <div key={i} className="flex items-center justify-between px-4 h-12 border-b border-mdb-outline-variant stagger-item">
                  <div>
                    <div className="font-semibold">{chest.name}</div>
                    <div className="font-mono text-xs text-mdb-text-muted">{chest.x}, {chest.y}, {chest.z}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-sm">{chest.itemName}</div>
                      {chest.itemCount !== undefined && <div className="text-mdb-text-muted text-[12px]">{chest.itemCount} items</div>}
                    </div>
                    <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-primary text-mdb-on-primary" onClick={() => setDeliverChest(chest)}>
                      <Send size={14} /> Deliver
                    </button>
                    <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high hover-glow" onClick={() => handleRescan(chest.x, chest.y, chest.z)}><RefreshCw size={14} /></button>
                  </div>
                </div>
              ))
            )}
            <div className="h-px bg-mdb-surface-high my-4" />
            <div className="flex items-center gap-2 text-lg font-bold mb-4 pb-2 border-b border-mdb-outline-variant mt-2">
              <Package size={18} />
              <span>Order Item</span>
            </div>
            <form onSubmit={handleOrder} className="p-4 bg-mdb-surface border border-mdb-surface-high">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Item name (e.g. diamond_sword)"
                  value={orderItem}
                  onChange={(e) => setOrderItem(e.target.value)}
                  className="flex-1"
                  disabled={ordering}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={orderCount}
                  onChange={(e) => setOrderCount(parseInt(e.target.value) || 1)}
                  min={1}
                  max={64}
                  className="flex-1"
                  disabled={ordering}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Player name (for tpa)"
                  value={orderPlayer}
                  onChange={(e) => setOrderPlayer(e.target.value)}
                  className="flex-1"
                  disabled={ordering}
                />
                <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary" disabled={ordering || !orderItem.trim()}>
                  {ordering ? 'Ordering...' : 'Order'}
                </button>
              </div>
            </form>
            <div className="h-px bg-mdb-surface-high my-4" />
            <div className="flex items-center gap-2 text-lg font-bold mb-4 pb-2 border-b border-mdb-outline-variant mt-2">
              <Truck size={18} />
              <span>Delivery Engine Settings</span>
            </div>
            <div className="bg-mdb-surface-low p-3 border border-mdb-surface-high">
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Delivery Transport Mode</label>
                  <select
                    value={deliveryConfig.DELIVERY_MODE}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, DELIVERY_MODE: e.target.value })}
                  >
                    <option value="TPA">TPA (Teleport Request)</option>
                    <option value="ELYTRA">ELYTRA (Autonomous Flight)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Target Coords Mode</label>
                  <select
                    value={deliveryConfig.TARGET_COORD_MODE}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, TARGET_COORD_MODE: e.target.value })}
                  >
                    <option value="USER">USER (Direct Coordinates)</option>
                    <option value="RANDOM_REGION">RANDOM_REGION (Bounded Region)</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Post-Delivery Action Waterfall</label>
                <select
                  value={deliveryConfig.POST_DELIVERY_ACTION}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, POST_DELIVERY_ACTION: e.target.value })}
                >
                  <option value="FLY_HOME">FLY_HOME (Fly back to base coordinates)</option>
                  <option value="ECHEST_SAVE_AND_DIE">ECHEST_SAVE_AND_DIE (Stash flight gear in EChest then suicide)</option>
                  <option value="DIRECT_DIE">DIRECT_DIE (Skip stashing, immediate suicide)</option>
                </select>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Key: Ender Chest</label>
                  <input
                    type="text"
                    value={deliveryConfig.STORAGE_KEYS?.ender || 'ender'}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, ender: e.target.value } })}
                  />
                </div>
                <div className="flex-1">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Key: Standard Chest</label>
                  <input
                    type="text"
                    value={deliveryConfig.STORAGE_KEYS?.chest || 'chest'}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, chest: e.target.value } })}
                  />
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Key: Elytra</label>
                  <input
                    type="text"
                    value={deliveryConfig.STORAGE_KEYS?.elytra || 'elytra'}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, elytra: e.target.value } })}
                  />
                </div>
                <div className="flex-1">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Key: Rockets</label>
                  <input
                    type="text"
                    value={deliveryConfig.STORAGE_KEYS?.rocket || 'rocket'}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, rocket: e.target.value } })}
                  />
                </div>
              </div>

              <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-primary text-mdb-on-primary mt-2" onClick={handleSaveDeliveryConfig}>
                Save Delivery Settings
              </button>
            </div>

            {showScanConfig && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-stretch justify-end animate-fade-in" onClick={() => setShowScanConfig(false)}>
                <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-surface-high flex flex-col overflow-y-auto animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-mdb-surface-high">
                    <span className="text-lg font-bold">Scan Configuration</span>
                    <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => setShowScanConfig(false)}>X</button>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="mb-4">
                      <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Scan Radius (blocks)</label>
                      <input type="number" value={scanConfig.scanRadius} onChange={(e) => setScanConfig({...scanConfig, scanRadius: parseInt(e.target.value) || 16})} min={8} max={128} />
                    </div>
                    <div className="mb-4">
                      <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Auto-rescan after delivery</label>
                      <select value={scanConfig.autoRescan ? 'true' : 'false'} onChange={(e) => setScanConfig({...scanConfig, autoRescan: e.target.value === 'true'})}>
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={() => setShowScanConfig(false)}>Cancel</button>
                      <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary" onClick={handleSaveScanConfig}>Save</button>
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
            <div className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-mdb-outline-variant">
              <Package size={18} />
              <span>Inventory ({inventory.length} items)</span>
              <div className="flex gap-2 ml-auto">
                <button
                  className={`inline-flex items-center gap-2 h-9 px-3 text-xs font-bold ${useWebViewer ? 'bg-mdb-primary text-mdb-on-primary' : 'text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high'}`}
                  onClick={() => setUseWebViewer(!useWebViewer)}
                >
                  {useWebViewer ? 'Mineflayer Web Viewer' : 'Grid View'}
                </button>
              </div>
            </div>

            {useWebViewer ? (
              <div className="w-full h-[520px] border border-mdb-surface-high rounded-[4px] overflow-hidden">
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
          <div className="max-w-[800px]">
            <div className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-mdb-outline-variant">
              <Settings size={18} />
              <span>Bot Settings</span>
            </div>
            <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
              <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">Information</div>
              <div className="mb-4">
                <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Bot Name</label>
                <input type="text" value={bot.name} readOnly className="text-mdb-text-muted" />
              </div>
              <div className="mb-4">
                <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Username</label>
                <input type="text" value={bot.username} readOnly className="text-mdb-text-muted" />
              </div>
              <div className="mb-4">
                <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Swarm</label>
                <input type="text" value={bot.swarmId || 'None'} readOnly className="text-mdb-text-muted" />
              </div>
            </div>
            <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
              <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">Server Connection</div>
              <div className="mb-4">
                <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Server IP / Host</label>
                <input type="text" value={bot.serverHost || ''} readOnly className="text-mdb-text-muted" placeholder="Not configured" />
              </div>
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Port</label>
                  <input type="text" value={bot.serverPort || 25565} readOnly className="text-mdb-text-muted" />
                </div>
                <div className="flex-1">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Version</label>
                  <input type="text" value={bot.serverVersion || 'auto'} readOnly className="text-mdb-text-muted" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Auth Mode</label>
                <input type="text" value={bot.authMode === 'OFFLINE' ? 'Offline (Cracked)' : 'Online (Premium)'} readOnly className="text-mdb-text-muted" />
              </div>
            </div>
            <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
              <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">Scan Settings</div>
              <div className="mb-4">
                <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Scan Radius</label>
                <input type="number" value={scanConfig.scanRadius} onChange={(e) => setScanConfig({...scanConfig, scanRadius: parseInt(e.target.value) || 16})} min={8} max={128} />
              </div>
              <div className="mb-4">
                <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">Auto-rescan</label>
                <select value={scanConfig.autoRescan ? 'true' : 'false'} onChange={(e) => setScanConfig({...scanConfig, autoRescan: e.target.value === 'true'})}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <button className="inline-flex items-center gap-2 px-5 h-12 text-sm font-bold bg-mdb-primary text-mdb-on-primary mt-2" onClick={handleSaveScanConfig}>Save Scan Settings</button>
            </div>
            <div className="bg-mdb-surface border border-mdb-surface-high p-6 mb-6">
              <div className="text-base font-semibold mb-4 pb-4 border-b border-mdb-outline-variant">Danger Zone</div>
              <button className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10" onClick={handleStop} disabled={!isOnline}>
                <Square size={14} /> Force Stop Bot
              </button>
            </div>
          </div>
        );
      case 'logs':
        return (
          <div className="max-w-[800px]">
            <div className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-mdb-outline-variant">
              <AlertTriangle size={18} />
              <span>Logs ({logs.length})</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto bg-mdb-bg border border-mdb-surface-high p-2">
              {logs.length === 0 ? (
                <div className="text-mdb-text-muted text-sm">No logs available</div>
              ) : (
                logs.slice(0, 100).map((log, i) => (
                  <div key={i} className="log-line font-mono text-xs leading-relaxed text-mdb-text-secondary py-0.5 border-b border-mdb-outline-variant hover:bg-mdb-surface-high">
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
      <div className="w-[280px] bg-mdb-surface border-r border-mdb-outline-variant flex flex-col shrink-0 max-md:!hidden">
        <div className="flex items-center gap-2 p-4 border-b border-mdb-outline-variant">
          <button className="inline-flex items-center justify-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base truncate">{bot.name}</div>
            <div className="font-mono text-xs text-mdb-text-muted">{bot.username}</div>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 px-4 border-b border-mdb-outline-variant">
          <StatusBadge status={status} />
          {isOnline ? (
            <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-working text-mdb-surface-lowest" onClick={handleStop}><Square size={14} /> Stop</button>
          ) : (
            <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-online text-mdb-surface-lowest" onClick={handleStart}><Play size={14} /> Start</button>
          )}
        </div>
        {isOnline && (
          <div className="py-2 px-4 border-b border-mdb-outline-variant">
            {bot.liveStatus?.health != null && (
              <div className="flex items-center gap-2 mb-1"><span className="font-mono text-[11px] text-mdb-text-muted uppercase tracking-wider min-w-[32px]">HP</span><HealthBar value={bot.liveStatus.health} /></div>
            )}
            {bot.liveStatus?.food != null && (
              <div className="flex items-center gap-2 mb-1"><span className="font-mono text-[11px] text-mdb-text-muted uppercase tracking-wider min-w-[32px]">Food</span><FoodBar value={bot.liveStatus.food} /></div>
            )}
            {bot.liveStatus?.position && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-mdb-text-muted uppercase tracking-wider min-w-[32px]">Pos</span>
                <span className="font-mono text-xs text-[12px]">{Math.round(bot.liveStatus.position.x)}, {Math.round(bot.liveStatus.position.y)}, {Math.round(bot.liveStatus.position.z)}</span>
              </div>
            )}
          </div>
        )}
        <nav className="flex-1 py-2 overflow-y-auto">
          {BOT_NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`flex items-center gap-2 w-full py-2 px-4 bg-transparent border-none text-sm text-mdb-text-secondary cursor-pointer text-left transition-colors hover:bg-mdb-surface-high hover:text-mdb-primary ${activeTab === id ? 'bg-mdb-surface-high text-mdb-primary font-semibold' : ''}`} onClick={() => setActiveTab(id)}>
              <Icon size={18} />
              <span>{label}</span>
              {id === 'chests' && chests.length > 0 && <span className="ml-auto bg-mdb-surface-highest text-mdb-text-secondary text-[11px] font-mono px-1.5 min-w-[20px] text-center">{chests.length}</span>}
            </button>
          ))}
        </nav>
        <div className="py-2 px-4 border-t border-mdb-outline-variant">
          <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={loadBotData}><RefreshCw size={16} /> Refresh</button>
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
      <div className="hidden max-md:flex fixed bottom-0 left-0 right-0 h-16 bg-mdb-surface border-t border-mdb-outline-variant z-[100] items-center justify-around">
        {BOT_NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`flex flex-col items-center gap-1 bg-transparent border-none text-mdb-text-muted cursor-pointer py-1 px-2 min-w-12 min-h-12 text-[11px] transition-colors relative ${activeTab === id ? 'text-mdb-primary' : 'hover:text-mdb-text'}`} onClick={() => setActiveTab(id)}>
            <Icon size={20} />
            <span>{label}</span>
            {activeTab === id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-mdb-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}
