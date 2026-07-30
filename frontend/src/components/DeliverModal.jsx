import React, { useState, useEffect } from 'react';
import { Send, X, User, Package, Navigation, Zap, Compass, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './ToastContainer';

export default function DeliverModal({ isOpen, onClose, chestName, botId, onDeliverSuccess }) {
  const [username, setUsername] = useState('');
  const [count, setCount] = useState(1);
  const [targetX, setTargetX] = useState('');
  const [targetZ, setTargetZ] = useState('');
  const [useCustomCoords, setUseCustomCoords] = useState(false);
  const [deliveryConfig, setDeliveryConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setCount(1);
      setTargetX('');
      setTargetZ('');
      setUseCustomCoords(false);

      api.fleet.getDeliveryConfig()
        .then(cfg => {
          setDeliveryConfig(cfg);
          if (cfg?.TARGET_COORD_MODE === 'USER') {
            setUseCustomCoords(true);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    const options = {};
    if (useCustomCoords && targetX !== '' && targetZ !== '') {
      options.targetX = parseInt(targetX, 10);
      options.targetZ = parseInt(targetZ, 10);
      options.hasExplicitCoords = true;
    }

    setLoading(true);
    try {
      await api.chests.orderItem(botId, chestName, count, username.trim(), options);
      addToast({ type: 'success', title: `Delivery started for ${username.trim()} (${chestName})` });
      if (onDeliverSuccess) onDeliverSuccess();
      onClose();
    } catch (error) {
      addToast({ type: 'error', title: error.message || 'Failed to start delivery' });
    } finally {
      setLoading(false);
    }
  };

  const deliveryMode = deliveryConfig?.DELIVERY_MODE || 'TPA';
  const coordMode = deliveryConfig?.TARGET_COORD_MODE || 'USER';

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-mdb-surface border-l border-mdb-border flex flex-col overflow-y-auto animate-slide-in-right shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-mdb-border">
          <div>
            <h2 className="text-lg font-semibold text-mdb-text">Deliver Item</h2>
            <p className="text-xs text-mdb-text-muted mt-0.5">{chestName}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-mdb-surface-high flex items-center justify-center text-mdb-text-muted hover:text-mdb-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 p-3 bg-mdb-bg rounded-lg border border-mdb-border">
            <div className="flex items-center gap-2">
              <Zap size={14} className={deliveryMode === 'ELYTRA' ? 'text-amber-400' : 'text-mdb-primary'} />
              <div>
                <span className="text-[11px] text-mdb-text-muted block">Transport</span>
                <span className={`text-xs font-medium ${deliveryMode === 'ELYTRA' ? 'text-amber-400' : 'text-mdb-primary'}`}>
                  {deliveryMode === 'ELYTRA' ? 'Elytra Flight' : 'TPA'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Compass size={14} className="text-emerald-400" />
              <div>
                <span className="text-[11px] text-mdb-text-muted block">Coord Mode</span>
                <span className="text-xs font-medium text-emerald-400">
                  {coordMode === 'RANDOM_REGION' ? 'Random Region' : 'User Input'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Minecraft Username *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={14} className="text-mdb-text-muted" />
              </div>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9"
                placeholder="e.g. Notch or PlayerName"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mdb-text-secondary mb-1.5">Quantity / Kit Count</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Package size={14} className="text-mdb-text-muted" />
              </div>
              <input
                type="number"
                required
                min="1"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-mdb-text-secondary flex items-center gap-1.5">
                <Navigation size={12} className="text-mdb-primary" />
                Custom Coordinates
              </label>
              <button
                type="button"
                onClick={() => setUseCustomCoords(!useCustomCoords)}
                className="text-xs font-medium text-mdb-primary hover:text-mdb-primary-hover transition-colors"
              >
                {useCustomCoords ? 'Hide' : '+ Specify'}
              </button>
            </div>

            {useCustomCoords ? (
              <div className="grid grid-cols-2 gap-3 p-3 bg-mdb-bg rounded-lg border border-mdb-border">
                <div>
                  <label className="block text-[11px] text-mdb-text-muted mb-1">Target X</label>
                  <input type="number" value={targetX} onChange={(e) => setTargetX(e.target.value)} placeholder="e.g. 1500" />
                </div>
                <div>
                  <label className="block text-[11px] text-mdb-text-muted mb-1">Target Z</label>
                  <input type="number" value={targetZ} onChange={(e) => setTargetZ(e.target.value)} placeholder="e.g. -2300" />
                </div>
                <p className="col-span-2 text-[11px] text-mdb-text-muted flex items-center gap-1 mt-1">
                  <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                  {targetX !== '' && targetZ !== ''
                    ? `Bot will deliver to (${targetX}, ${targetZ})`
                    : 'In USER mode, bot will whisper player for coords.'}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-mdb-text-muted italic">
                {deliveryMode === 'ELYTRA' && coordMode === 'USER'
                  ? 'Bot will whisper the target player for delivery coordinates.'
                  : 'Coordinates resolved automatically per fleet delivery settings.'}
              </p>
            )}
          </div>

          <div className="pt-4 flex gap-3 border-t border-mdb-border">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-mdb-border text-sm font-medium text-mdb-text-secondary hover:bg-mdb-surface-high transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="flex-1 h-10 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
