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
      await api.fleet.sendBotCommand(botId, command);
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
      await api.fleet.sendBotCommand(botId, `say ${chatInput}`);
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

  if (loading) return <div className="loading-state">Loading...</div>;
  if (!bot) return (
    <div className="empty-state">
      <div className="empty-state-title">Bot not found</div>
      <button className="btn btn-primary mt-md" onClick={() => navigate('/fleet/bots')}>Back to Bots</button>
    </div>
  );

  const status = bot.liveStatus?.status || bot.status;
  const isOnline = !['OFFLINE', 'ERROR'].includes(status);

  const renderContent = () => {
    switch (activeTab) {
      case 'console':
        return (
          <div className="bot-panel-section">
            <div className="bot-panel-section-header">
              <Terminal size={18} />
              <span>Live Console</span>
            </div>
            <div className="chat-container">
              {chatMessages.length === 0 ? (
                <div className="text-muted text-sm">No messages yet. Send a command or chat message below.</div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="chat-line">
                    <span className="chat-time">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                    <span className={`chat-sender ${msg.sender === 'you' ? 'chat-you' : ''}`}>{msg.sender}:</span>
                    {msg.message}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSend} className="flex gap-sm">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something..."
                className="command-input flex-1"
                disabled={!isOnline}
              />
              <button type="submit" className="btn btn-primary" disabled={!isOnline}>
                <Send size={16} />
              </button>
            </form>
            <form onSubmit={handleSendCommand} className="flex gap-sm mt-sm">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="/command"
                className="command-input flex-1"
                disabled={!isOnline}
              />
              <button type="submit" className="btn btn-secondary" disabled={!isOnline}>
                <Terminal size={16} /> Exec
              </button>
            </form>
          </div>
        );
      case 'chests':
        return (
          <div className="bot-panel-section">
            <div className="bot-panel-section-header">
              <Box size={18} />
              <span>Chest Scanner</span>
              <div className="flex gap-sm ml-auto">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowScanConfig(true)}>
                  <Settings size={14} /> Config
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleScan} disabled={scanning || !isOnline}>
                  <Scan size={14} /> {scanning ? 'Scanning...' : 'Scan'}
                </button>
              </div>
            </div>
            {scanning && scanProgress && (
              <div className="scan-progress-container">
                <div className="scan-progress-track">
                  <div className="scan-progress-fill" style={{ width: `${scanProgress.percent}%` }} />
                </div>
                <span className="scan-progress-text">{scanProgress.phase} ({scanProgress.percent}%) {scanProgress.found ? `- ${scanProgress.found} found` : ''}</span>
              </div>
            )}
            {chests.length === 0 ? (
              <div className="empty-state animate-fade-in">
                <div className="empty-state-title">No chests found</div>
                <div className="empty-state-text">Run a scan to discover chests</div>
              </div>
            ) : (
              chests.map((chest, i) => (
                <div key={i} className="list-item stagger-item">
                  <div>
                    <div className="list-item-name">{chest.name}</div>
                    <div className="list-item-meta mono-sm">{chest.x}, {chest.y}, {chest.z}</div>
                  </div>
                  <div className="flex items-center gap-sm">
                    <div className="text-right">
                      <div className="text-sm">{chest.itemName}</div>
                      {chest.itemCount !== undefined && <div className="text-muted text-xs">{chest.itemCount} items</div>}
                    </div>
                    <button className="btn btn-primary btn-sm flex items-center gap-xs" onClick={() => setDeliverChest(chest)}>
                      <Send size={14} /> Deliver
                    </button>
                    <button className="btn btn-ghost btn-sm hover-glow" onClick={() => handleRescan(chest.x, chest.y, chest.z)}><RefreshCw size={14} /></button>
                  </div>
                </div>
              ))
            )}
            <div className="divider" />
            <div className="bot-panel-section-header" style={{ marginTop: '8px' }}>
              <Package size={18} />
              <span>Order Item</span>
            </div>
            <form onSubmit={handleOrder} className="order-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Item name (e.g. diamond_sword)"
                  value={orderItem}
                  onChange={(e) => setOrderItem(e.target.value)}
                  className="form-input"
                  disabled={ordering}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={orderCount}
                  onChange={(e) => setOrderCount(parseInt(e.target.value) || 1)}
                  min={1}
                  max={64}
                  className="form-input form-input-sm"
                  disabled={ordering}
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Player name (for tpa)"
                  value={orderPlayer}
                  onChange={(e) => setOrderPlayer(e.target.value)}
                  className="form-input"
                  disabled={ordering}
                />
                <button type="submit" className="btn btn-primary" disabled={ordering || !orderItem.trim()}>
                  {ordering ? 'Ordering...' : 'Order'}
                </button>
              </div>
            </form>
            <div className="divider" />
            <div className="bot-panel-section-header" style={{ marginTop: '8px' }}>
              <Truck size={18} />
              <span>Delivery Engine Settings</span>
            </div>
            <div className="section" style={{ background: '#1c1b1b', padding: '12px', borderRadius: '4px', border: '1px solid #2a2a2a' }}>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Delivery Transport Mode</label>
                  <select
                    value={deliveryConfig.DELIVERY_MODE}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, DELIVERY_MODE: e.target.value })}
                  >
                    <option value="TPA">TPA (Teleport Request)</option>
                    <option value="ELYTRA">ELYTRA (Autonomous Flight)</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Target Coords Mode</label>
                  <select
                    value={deliveryConfig.TARGET_COORD_MODE}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, TARGET_COORD_MODE: e.target.value })}
                  >
                    <option value="USER">USER (Direct Coordinates)</option>
                    <option value="RANDOM_REGION">RANDOM_REGION (Bounded Region)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Post-Delivery Action Waterfall</label>
                <select
                  value={deliveryConfig.POST_DELIVERY_ACTION}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, POST_DELIVERY_ACTION: e.target.value })}
                >
                  <option value="FLY_HOME">FLY_HOME (Fly back to base coordinates)</option>
                  <option value="ECHEST_SAVE_AND_DIE">ECHEST_SAVE_AND_DIE (Stash flight gear in EChest then suicide)</option>
                  <option value="DIRECT_DIE">DIRECT_DIE (Skip stashing, immediate suicide)</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Key: Ender Chest</label>
                  <input
                    type="text"
                    value={deliveryConfig.STORAGE_KEYS?.ender || 'ender'}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, ender: e.target.value } })}
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Key: Standard Chest</label>
                  <input
                    type="text"
                    value={deliveryConfig.STORAGE_KEYS?.chest || 'chest'}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, chest: e.target.value } })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Key: Elytra</label>
                  <input
                    type="text"
                    value={deliveryConfig.STORAGE_KEYS?.elytra || 'elytra'}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, elytra: e.target.value } })}
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Key: Rockets</label>
                  <input
                    type="text"
                    value={deliveryConfig.STORAGE_KEYS?.rocket || 'rocket'}
                    onChange={(e) => setDeliveryConfig({ ...deliveryConfig, STORAGE_KEYS: { ...deliveryConfig.STORAGE_KEYS, rocket: e.target.value } })}
                  />
                </div>
              </div>

              <button className="btn btn-primary btn-sm mt-sm" onClick={handleSaveDeliveryConfig}>
                Save Delivery Settings
              </button>
            </div>

            {showScanConfig && (
              <div className="drawer-overlay animate-fade-in" onClick={() => setShowScanConfig(false)}>
                <div className="drawer animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
                  <div className="drawer-header">
                    <span className="drawer-title">Scan Configuration</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowScanConfig(false)}>X</button>
                  </div>
                  <div className="drawer-body">
                    <div className="form-group">
                      <label className="form-label">Scan Radius (blocks)</label>
                      <input type="number" value={scanConfig.scanRadius} onChange={(e) => setScanConfig({...scanConfig, scanRadius: parseInt(e.target.value) || 16})} min={8} max={128} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Auto-rescan after delivery</label>
                      <select value={scanConfig.autoRescan ? 'true' : 'false'} onChange={(e) => setScanConfig({...scanConfig, autoRescan: e.target.value === 'true'})}>
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div className="flex gap-sm mt-md">
                      <button className="btn btn-secondary" onClick={() => setShowScanConfig(false)}>Cancel</button>
                      <button className="btn btn-primary" onClick={handleSaveScanConfig}>Save</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'inventory':
        return (
          <div className="bot-panel-section">
            <div className="bot-panel-section-header">
              <Package size={18} />
              <span>Inventory ({inventory.length} items)</span>
              <div className="flex gap-sm ml-auto">
                <button
                  className={`btn btn-sm ${useWebViewer ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setUseWebViewer(!useWebViewer)}
                >
                  {useWebViewer ? 'Mineflayer Web Viewer' : 'Grid View'}
                </button>
              </div>
            </div>

            {useWebViewer ? (
              <div className="web-inventory-frame-container" style={{ width: '100%', height: '520px', border: '1px solid #2a2a2a', borderRadius: '4px', overflow: 'hidden' }}>
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
                    <div key={i} className={`inventory-slot ${item ? '' : 'empty'}`}>
                      {item && (
                        <>
                          <span className="inventory-slot-name">{item.name}</span>
                          {item.count > 1 && <span className="inventory-slot-count">{item.count}</span>}
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
          <div className="bot-panel-section">
            <div className="bot-panel-section-header">
              <Settings size={18} />
              <span>Bot Settings</span>
            </div>
            <div className="section">
              <div className="section-header">Information</div>
              <div className="form-group">
                <label className="form-label">Bot Name</label>
                <input type="text" value={bot.name} readOnly className="text-muted" />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input type="text" value={bot.username} readOnly className="text-muted" />
              </div>
              <div className="form-group">
                <label className="form-label">Swarm</label>
                <input type="text" value={bot.swarmId || 'None'} readOnly className="text-muted" />
              </div>
            </div>
            <div className="section">
              <div className="section-header">Server Connection</div>
              <div className="form-group">
                <label className="form-label">Server IP / Host</label>
                <input type="text" value={bot.serverHost || ''} readOnly className="text-muted" placeholder="Not configured" />
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Port</label>
                  <input type="text" value={bot.serverPort || 25565} readOnly className="text-muted" />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Version</label>
                  <input type="text" value={bot.serverVersion || 'auto'} readOnly className="text-muted" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Auth Mode</label>
                <input type="text" value={bot.authMode === 'OFFLINE' ? 'Offline (Cracked)' : 'Online (Premium)'} readOnly className="text-muted" />
              </div>
            </div>
            <div className="section">
              <div className="section-header">Scan Settings</div>
              <div className="form-group">
                <label className="form-label">Scan Radius</label>
                <input type="number" value={scanConfig.scanRadius} onChange={(e) => setScanConfig({...scanConfig, scanRadius: parseInt(e.target.value) || 16})} min={8} max={128} />
              </div>
              <div className="form-group">
                <label className="form-label">Auto-rescan</label>
                <select value={scanConfig.autoRescan ? 'true' : 'false'} onChange={(e) => setScanConfig({...scanConfig, autoRescan: e.target.value === 'true'})}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <button className="btn btn-primary mt-sm" onClick={handleSaveScanConfig}>Save Scan Settings</button>
            </div>
            <div className="section">
              <div className="section-header">Danger Zone</div>
              <button className="btn btn-danger" onClick={handleStop} disabled={!isOnline}>
                <Square size={14} /> Force Stop Bot
              </button>
            </div>
          </div>
        );
      case 'logs':
        return (
          <div className="bot-panel-section">
            <div className="bot-panel-section-header">
              <AlertTriangle size={18} />
              <span>Logs ({logs.length})</span>
            </div>
            <div className="log-container">
              {logs.length === 0 ? (
                <div className="text-muted text-sm">No logs available</div>
              ) : (
                logs.slice(0, 100).map((log, i) => (
                  <div key={i} className="log-line">
                    <span className="log-line-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
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
    <div className="bot-panel">
      {/* Desktop Sidebar */}
      <div className="bot-panel-sidebar">
        <div className="bot-panel-sidebar-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <div className="bot-panel-sidebar-info">
            <div className="bot-panel-sidebar-name">{bot.name}</div>
            <div className="bot-panel-sidebar-username mono-sm">{bot.username}</div>
          </div>
        </div>
        <div className="bot-panel-sidebar-status">
          <StatusBadge status={status} />
          {isOnline ? (
            <button className="btn btn-warning btn-sm" onClick={handleStop}><Square size={14} /> Stop</button>
          ) : (
            <button className="btn btn-success btn-sm" onClick={handleStart}><Play size={14} /> Start</button>
          )}
        </div>
        {isOnline && (
          <div className="bot-panel-sidebar-stats">
            {bot.liveStatus?.health != null && (
              <div className="bot-panel-stat"><span className="bot-panel-stat-label">HP</span><HealthBar value={bot.liveStatus.health} /></div>
            )}
            {bot.liveStatus?.food != null && (
              <div className="bot-panel-stat"><span className="bot-panel-stat-label">Food</span><FoodBar value={bot.liveStatus.food} /></div>
            )}
            {bot.liveStatus?.position && (
              <div className="bot-panel-stat">
                <span className="bot-panel-stat-label">Pos</span>
                <span className="mono-sm text-xs">{Math.round(bot.liveStatus.position.x)}, {Math.round(bot.liveStatus.position.y)}, {Math.round(bot.liveStatus.position.z)}</span>
              </div>
            )}
          </div>
        )}
        <nav className="bot-panel-nav">
          {BOT_NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`bot-panel-nav-item ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
              <Icon size={18} />
              <span>{label}</span>
              {id === 'chests' && chests.length > 0 && <span className="bot-panel-nav-badge">{chests.length}</span>}
            </button>
          ))}
        </nav>
        <div className="bot-panel-sidebar-footer">
          <button className="btn btn-ghost btn-sm" onClick={loadBotData}><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bot-panel-content">
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
      <div className="bot-panel-tabbar">
        {BOT_NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`bot-panel-tabbar-item ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
