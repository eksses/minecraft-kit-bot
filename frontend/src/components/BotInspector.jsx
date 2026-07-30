import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from './ui';
import { HealthBar, FoodBar } from './ui/StatusComponents';
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
      await api.fleet.sendCommand(botId, command);
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
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-stretch justify-end" onClick={onClose}>
        <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-surface-high flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-12 text-center text-mdb-text-muted">Loading bot data...</div>
        </div>
      </div>
    );
  }

  if (!bot) return null;

  const status = bot.liveStatus?.status || bot.status;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-stretch justify-end" onClick={onClose}>
      <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-surface-high flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-mdb-surface-high">
          <span className="text-lg font-bold">{bot.name}</span>
          <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <StatusBadge status={status} />
            <div className="flex gap-2">
              {status === 'OFFLINE' ? (
                <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-online text-mdb-surface-lowest" onClick={handleStart}>Start</button>
              ) : (
                <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold bg-mdb-working text-mdb-surface-lowest" onClick={handleStop}>Stop</button>
              )}
            </div>
          </div>

          <div className="text-sm mb-4">
            <div className="mb-2"><span className="text-mdb-text-muted">Username:</span> {bot.username}</div>
            <div className="mb-2"><span className="text-mdb-text-muted">Server:</span> {bot.liveStatus?.serverConfig?.name || 'Not assigned'}</div>
            <div className="font-mono text-sm">
              <span className="text-mdb-text-muted">Position:</span>{' '}
              {bot.liveStatus?.position
                ? `${Math.round(bot.liveStatus.position.x)}, ${Math.round(bot.liveStatus.position.y)}, ${Math.round(bot.liveStatus.position.z)}`
                : 'N/A'}
            </div>
          </div>

          {bot.liveStatus?.health != null && <HealthBar value={bot.liveStatus.health} />}
          {bot.liveStatus?.food != null && <FoodBar value={bot.liveStatus.food} />}

          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Inventory</h3>
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
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Command</h3>
            <form onSubmit={handleSendCommand} className="flex gap-2">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="/say hello"
                className="flex-1 font-mono text-[13px]"
              />
              <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary" aria-label="Send command">
                <Send size={16} />
              </button>
            </form>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Logs</h3>
            <div className="max-h-[200px] overflow-y-auto bg-mdb-bg border border-mdb-surface-high p-2">
              {logs.length === 0 ? (
                <div className="text-mdb-text-muted text-sm">No logs available</div>
              ) : (
                logs.slice(0, 20).map((log, i) => (
                  <div key={i} className="log-line font-mono text-xs leading-relaxed text-mdb-text-secondary py-0.5 border-b border-mdb-outline-variant hover:bg-mdb-surface-high">
                    <span className="text-mdb-text-muted mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
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
