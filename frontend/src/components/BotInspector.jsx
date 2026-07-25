import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge, HealthBar, FoodBar } from './ui/StatusComponents';
import { useToast } from './ToastContainer';
import { X, Send } from 'lucide-react';

export default function BotInspector({ botId, onClose }) {
  const [bot, setBot] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    if (botId) loadBotData();
  }, [botId]);

  const loadBotData = async () => {
    try {
      const [botData, invData, logData] = await Promise.all([
        api.fleet.getBot(botId),
        api.fleet.getBotInventory(botId),
        api.fleet.getBotLogs(botId),
      ]);
      setBot(botData);
      setInventory(invData);
      setLogs(logData);
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
      setCommand('');
      loadBotData();
      addToast({ type: 'success', title: 'Command sent' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to send command' });
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

  if (loading) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div style={{padding: '48px', textAlign: 'center', color: 'var(--text-muted)'}}>Loading bot data...</div>
        </div>
      </div>
    );
  }

  if (!bot) return null;

  const status = bot.liveStatus?.status || bot.status;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <span className="drawer-title">{bot.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="flex justify-between items-center mb-md">
            <StatusBadge status={status} />
            <div className="flex gap-sm">
              {status === 'OFFLINE' ? (
                <button className="btn btn-success btn-sm" onClick={handleStart}>Start</button>
              ) : (
                <button className="btn btn-warning btn-sm" onClick={handleStop}>Stop</button>
              )}
            </div>
          </div>

          <div style={{fontSize: '14px', marginBottom: 'var(--space-md)'}}>
            <div><span style={{color: 'var(--text-muted)'}}>Username:</span> {bot.username}</div>
            <div><span style={{color: 'var(--text-muted)'}}>Server:</span> {bot.liveStatus?.serverConfig?.name || 'Not assigned'}</div>
            <div style={{fontFamily: 'var(--font-mono)', fontSize: '13px'}}>
              <span style={{color: 'var(--text-muted)'}}>Position:</span>{' '}
              {bot.liveStatus?.position
                ? `${Math.round(bot.liveStatus.position.x)}, ${Math.round(bot.liveStatus.position.y)}, ${Math.round(bot.liveStatus.position.z)}`
                : 'N/A'}
            </div>
          </div>

          {bot.liveStatus?.health != null && <HealthBar value={bot.liveStatus.health} />}
          {bot.liveStatus?.food != null && <FoodBar value={bot.liveStatus.food} />}

          <div className="mt-md">
            <h3 style={{fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-sm)'}}>Inventory</h3>
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
          </div>

          <div className="mt-md">
            <h3 style={{fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-sm)'}}>Command</h3>
            <form onSubmit={handleSendCommand} className="flex gap-sm">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="/say hello"
                className="command-input flex-1"
              />
              <button type="submit" className="btn btn-primary">
                <Send size={16} />
              </button>
            </form>
          </div>

          <div className="mt-md">
            <h3 style={{fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-sm)'}}>Logs</h3>
            <div style={{maxHeight: '200px', overflowY: 'auto', background: 'var(--bg)', border: '1px solid var(--bg-surface-high)', padding: 'var(--space-sm)'}}>
              {logs.length === 0 ? (
                <div style={{color: 'var(--text-muted)', fontSize: '13px'}}>No logs available</div>
              ) : (
                logs.slice(0, 20).map((log, i) => (
                  <div key={i} className="log-line">
                    <span className="log-line-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
