import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';

export default function ChestManager() {
  const [chests, setChests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', x: 0, y: 0, z: 0, itemName: '' });
  const { addToast } = useToast();

  // Bot selector state (D-14b)
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [bots, setBots] = useState([]);

  // Scan state (D-01, D-17)
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanResults, setScanResults] = useState(null);

  // Scan config state (D-02, D-15)
  const [showScanConfig, setShowScanConfig] = useState(false);
  const [scanConfig, setScanConfig] = useState({
    scanMarkedEnabled: false,
    scanRadius: 32,
    autoScanOnConnect: false,
    allowUnnamedOrders: true,
  });

  // Load bots list on mount
  useEffect(() => {
    api.fleet.getBots().then(setBots).catch(() => {
      addToast({ type: 'error', title: 'Failed to load bots' });
    });
  }, []);

  // Load chests and scan config when bot is selected
  const loadChestsForBot = useCallback(async (botId) => {
    if (!botId) { setChests([]); return; }
    try {
      const data = await api.chests.listForBot(botId);
      setChests(data);
    } catch {
      addToast({ type: 'error', title: 'Failed to load chests' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const loadScanConfig = useCallback(async (botId) => {
    if (!botId) return;
    try {
      const config = await api.chests.getScanConfig(botId);
      if (config) setScanConfig(config);
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => {
    if (selectedBotId) {
      setLoading(true);
      loadChestsForBot(selectedBotId);
      loadScanConfig(selectedBotId);
    }
  }, [selectedBotId, loadChestsForBot, loadScanConfig]);

  // WebSocket subscription for scan progress (D-17)
  useEffect(() => {
    api.realtime.connect();

    const unsubProgress = api.realtime.on('scan-progress', (msg) => {
      if (msg.botId === selectedBotId) {
        setScanProgress(msg.data);
      }
    });

    const unsubComplete = api.realtime.on('scan-complete', (msg) => {
      if (msg.botId === selectedBotId) {
        setScanResults(msg.data);
        setScanning(false);
        setScanProgress(null);
        loadChestsForBot(selectedBotId);
        addToast({ type: 'success', title: `Scan complete: ${msg.data?.cataloged ?? 0} chests cataloged` });
      }
    });

    return () => {
      unsubProgress();
      unsubComplete();
    };
  }, [selectedBotId, loadChestsForBot, addToast]);

  // Subscribe to bot events when selected
  useEffect(() => {
    if (selectedBotId) {
      api.realtime.subscribeBot(selectedBotId);
      return () => api.realtime.unsubscribeBot(selectedBotId);
    }
  }, [selectedBotId]);

  // ---- Handlers ----

  const handleStartScan = async () => {
    if (!selectedBotId) {
      addToast({ type: 'error', title: 'Select a bot first' });
      return;
    }
    try {
      setScanning(true);
      setScanResults(null);
      await api.chests.triggerScan(selectedBotId, scanConfig.scanRadius);
    } catch (err) {
      setScanning(false);
      addToast({ type: 'error', title: err.message || 'Failed to start scan' });
    }
  };

  const handleAbortScan = async () => {
    try {
      await api.chests.abortScan(selectedBotId);
      setScanning(false);
      setScanProgress(null);
      addToast({ type: 'info', title: 'Scan aborted' });
    } catch {
      addToast({ type: 'error', title: 'Failed to abort scan' });
    }
  };

  const handleSaveScanConfig = async () => {
    try {
      await api.chests.updateScanConfig(selectedBotId, scanConfig);
      setShowScanConfig(false);
      addToast({ type: 'success', title: 'Scan settings saved' });
    } catch (err) {
      addToast({ type: 'error', title: err.message || 'Failed to save settings' });
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      if (selectedBotId) {
        await api.chests.createForBot(selectedBotId, form);
      } else {
        await api.fleet.createChest(form);
      }
      setShowAdd(false);
      setForm({ name: '', x: 0, y: 0, z: 0, itemName: '' });
      if (selectedBotId) loadChestsForBot(selectedBotId);
      else loadChestsForBot(null);
      addToast({ type: 'success', title: 'Chest added' });
    } catch {
      addToast({ type: 'error', title: 'Failed to add chest' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this chest?')) return;
    try {
      await api.fleet.deleteChest(id);
      if (selectedBotId) loadChestsForBot(selectedBotId);
      addToast({ type: 'success', title: 'Chest deleted' });
    } catch {
      addToast({ type: 'error', title: 'Failed to delete chest' });
    }
  };

  if (loading && !selectedBotId) {
    return <div style={{padding: '48px', textAlign: 'center', color: 'var(--text-muted)'}}>Loading...</div>;
  }

  return (
    <div>
      {/* Bot Selector (D-14b) */}
      <div className="form-group" style={{marginBottom: 'var(--space-lg)'}}>
        <label className="form-label">Bot</label>
        <select
          className="form-select"
          value={selectedBotId || ''}
          onChange={(e) => {
            setSelectedBotId(e.target.value || null);
            setChests([]);
            setLoading(true);
          }}
        >
          <option value="">Select a bot...</option>
          {bots.map(bot => (
            <option key={bot.id} value={bot.id}>{bot.name} ({bot.status})</option>
          ))}
        </select>
      </div>

      {/* Page Header with Scan Buttons */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Chests</h1>
          <p className="page-subtitle">
            {selectedBotId ? 'Bot-scoped storage management' : 'Storage location management'}
          </p>
        </div>
        <div className="flex gap-sm">
          <button
            className="btn btn-secondary"
            onClick={() => setShowScanConfig(true)}
            disabled={!selectedBotId}
          >
            Scan Settings
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStartScan}
            disabled={scanning || !selectedBotId}
          >
            {scanning ? 'Scanning...' : 'Scan Area'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAdd(true)}>
            Add Chest
          </button>
        </div>
      </div>

      {/* Scan Progress Indicator (D-17) */}
      {scanning && scanProgress && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-surface-high)',
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          <div style={{
            flex: 1,
            height: '6px',
            background: 'var(--bg-surface-high)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: 'var(--status-working)',
              transition: 'width 0.3s ease',
              width: scanProgress.total
                ? `${(scanProgress.current / scanProgress.total) * 100}%`
                : '100%',
            }} />
          </div>
          <span style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            minWidth: '140px',
            fontFamily: 'var(--font-mono)',
          }}>
            {scanProgress.phase === 'discovery'
              ? `Found ${scanProgress.found} chests...`
              : scanProgress.total
                ? `Scanning ${scanProgress.current}/${scanProgress.total}...`
                : 'Processing...'
            }
          </span>
          <button className="btn btn-danger btn-sm" onClick={handleAbortScan}>
            Abort
          </button>
        </div>
      )}

      {/* Scan Results Summary */}
      {scanResults && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--status-online)',
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          fontSize: '14px',
          color: 'var(--status-online)',
        }}>
          Scan complete: {scanResults.cataloged ?? 0} chests cataloged
          {scanResults.errors?.length > 0 && (
            <span style={{color: 'var(--status-error)', marginLeft: 'var(--space-md)'}}>
              {scanResults.errors.length} errors
            </span>
          )}
        </div>
      )}

      {/* Chest Grid */}
      {chests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">
            {selectedBotId ? 'No chests for this bot' : 'Select a bot to view chests'}
          </div>
          <div className="empty-state-text">
            {selectedBotId
              ? 'Add chest locations or run a scan to discover chests'
              : 'Choose a bot from the dropdown above'
            }
          </div>
          {selectedBotId && (
            <button className="btn btn-primary mt-md" onClick={() => setShowAdd(true)}>Add Chest</button>
          )}
        </div>
      ) : (
        <div className="grid-2col">
          {chests.map((chest) => (
            <div key={chest.id} className="bot-card">
              <div className="bot-card-header">
                <span style={{fontWeight: 600}}>{chest.name}</span>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(chest.id)}>Delete</button>
              </div>
              <div className="bot-card-info">
                <div style={{fontFamily: 'var(--font-mono)', fontSize: '13px'}}>
                  {chest.x}, {chest.y}, {chest.z}
                </div>
                <div>{chest.itemName}</div>
                {chest.itemCount !== undefined && (
                  <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                    Count: {chest.itemCount}
                  </div>
                )}
                {chest.source && (
                  <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                    Source: {chest.source}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Chest Drawer */}
      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Add Chest Location</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>X</button>
            </div>
            <div className="drawer-body">
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label className="form-label">Chest Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Main Storage" />
                </div>
                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <input type="text" value={form.itemName} onChange={(e) => setForm({...form, itemName: e.target.value})} required placeholder="diamond" />
                </div>
                <div className="flex gap-sm">
                  <div className="form-group flex-1">
                    <label className="form-label">X</label>
                    <input type="number" value={form.x} onChange={(e) => setForm({...form, x: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Y</label>
                    <input type="number" value={form.y} onChange={(e) => setForm({...form, y: parseInt(e.target.value)})} required />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Z</label>
                    <input type="number" value={form.z} onChange={(e) => setForm({...form, z: parseInt(e.target.value)})} required />
                  </div>
                </div>
                <div className="flex gap-sm mt-md">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Chest</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Scan Config Modal */}
      {showScanConfig && (
        <div className="drawer-overlay" onClick={() => setShowScanConfig(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Scan Settings</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowScanConfig(false)}>X</button>
            </div>
            <div className="drawer-body">
              <div className="form-group">
                <label className="form-label">Scan Radius (blocks)</label>
                <input
                  type="number"
                  min="1"
                  max="128"
                  value={scanConfig.scanRadius}
                  onChange={(e) => setScanConfig({...scanConfig, scanRadius: parseInt(e.target.value) || 32})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={scanConfig.scanMarkedEnabled}
                    onChange={(e) => setScanConfig({...scanConfig, scanMarkedEnabled: e.target.checked})}
                    style={{width: 'auto', height: 'auto'}}
                  />
                  Scan Marked Only (signs with #Name)
                </label>
              </div>
              <div className="form-group">
                <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={scanConfig.autoScanOnConnect}
                    onChange={(e) => setScanConfig({...scanConfig, autoScanOnConnect: e.target.checked})}
                    style={{width: 'auto', height: 'auto'}}
                  />
                  Auto-scan on bot connect
                </label>
              </div>
              <div className="form-group">
                <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={scanConfig.allowUnnamedOrders}
                    onChange={(e) => setScanConfig({...scanConfig, allowUnnamedOrders: e.target.checked})}
                    style={{width: 'auto', height: 'auto'}}
                  />
                  Allow orders from unnamed chests
                </label>
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
}
