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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-mdb-surface border border-mdb-surface-high shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
        <div className="flex items-center justify-between p-5 border-b border-mdb-surface-high">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-mdb-primary/10 border border-mdb-primary/20 text-mdb-primary">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-mdb-text">Deliver {chestName}</h2>
              <p className="text-xs text-mdb-text-muted">Dispatch kit to in-game player or coordinates</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-mdb-text-muted hover:text-mdb-text hover:bg-mdb-surface-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 p-3 bg-mdb-bg border border-mdb-outline-variant">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${deliveryMode === 'ELYTRA' ? 'text-mdb-working' : 'text-mdb-primary'}`} />
              <div>
                <span className="text-xs text-mdb-text-muted block">Transport Mode</span>
                <span className={`text-xs font-bold ${deliveryMode === 'ELYTRA' ? 'text-mdb-working' : 'text-mdb-primary'}`}>
                  {deliveryMode === 'ELYTRA' ? 'Elytra Wings Flight' : 'TPA Teleportation'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-mdb-online" />
              <div>
                <span className="text-xs text-mdb-text-muted block">Coordinate Mode</span>
                <span className="text-xs font-bold text-mdb-online">
                  {coordMode === 'RANDOM_REGION' ? 'Random Region Bounds' : 'User Prompt / Input'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-mdb-text-secondary uppercase tracking-wider mb-2">
              Minecraft Target Username *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-mdb-text-muted" />
              </div>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 text-sm"
                placeholder="e.g. Notch or PlayerName"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-mdb-text-secondary uppercase tracking-wider mb-2">
              Quantity / Kit Count
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Package className="h-4 w-4 text-mdb-text-muted" />
              </div>
              <input
                type="number"
                required
                min="1"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="block w-full pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-mdb-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-mdb-primary" />
                Target Delivery Coordinates (X / Z)
              </label>
              <button
                type="button"
                onClick={() => setUseCustomCoords(!useCustomCoords)}
                className="text-xs font-medium text-mdb-primary hover:text-mdb-primary/80 transition-colors"
              >
                {useCustomCoords ? 'Hide Custom Coords' : '+ Specify Coords'}
              </button>
            </div>

            {useCustomCoords ? (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-mdb-bg border border-mdb-outline-variant animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-mdb-text-muted mb-1">Target X</label>
                  <input
                    type="number"
                    value={targetX}
                    onChange={(e) => setTargetX(e.target.value)}
                    placeholder="e.g. 1500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mdb-text-muted mb-1">Target Z</label>
                  <input
                    type="number"
                    value={targetZ}
                    onChange={(e) => setTargetZ(e.target.value)}
                    placeholder="e.g. -2300"
                  />
                </div>
                <p className="col-span-2 text-[11px] text-mdb-text-muted flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-mdb-online shrink-0" />
                  {targetX !== '' && targetZ !== '' 
                    ? `Bot will deliver directly to coordinates (${targetX}, ${targetZ})`
                    : `If left empty in USER mode, bot will whisper player in-game for coordinates.`}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-mdb-text-muted italic">
                {deliveryMode === 'ELYTRA' && coordMode === 'USER'
                  ? 'In USER mode, bot will whisper the target player in-game for delivery coordinates.'
                  : 'Coordinates will be resolved automatically according to active fleet delivery settings.'}
              </p>
            )}
          </div>
          
          <div className="pt-3 flex justify-end gap-3 border-t border-mdb-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-mdb-text-secondary bg-mdb-surface-high hover:bg-mdb-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="px-5 py-2.5 text-xs font-bold text-mdb-on-primary bg-mdb-primary hover:bg-mdb-primary/80 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-mdb-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Dispatch Kit Delivery
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
