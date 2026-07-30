import { useState, useEffect } from 'react';
import { User, Package, Navigation, Zap, Compass, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './ToastContainer';
import {
  Modal, Input, Button, Badge, Toggle
} from './ui';

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
    if (!isOpen) return;
    setUsername('');
    setCount(1);
    setTargetX('');
    setTargetZ('');
    setUseCustomCoords(false);

    api.fleet.getDeliveryConfig()
      .then(cfg => {
        setDeliveryConfig(cfg);
        if (cfg?.TARGET_COORD_MODE === 'USER') setUseCustomCoords(true);
      })
      .catch(() => {});
  }, [isOpen]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Deliver Item" size="md">
      <p className="text-xs text-mdb-text-muted mb-5">{chestName}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4 p-3 bg-mdb-bg rounded-lg border border-mdb-border">
          <div className="flex items-center gap-2">
            <Zap size={14} className={deliveryMode === 'ELYTRA' ? 'text-amber-400' : 'text-mdb-primary'} />
            <div>
              <span className="text-[11px] text-mdb-text-muted block">Transport</span>
              <Badge variant={deliveryMode === 'ELYTRA' ? 'warning' : 'info'} size="sm">
                {deliveryMode === 'ELYTRA' ? 'Elytra Flight' : 'TPA'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-mdb-success" />
            <div>
              <span className="text-[11px] text-mdb-text-muted block">Coord Mode</span>
              <Badge variant="success" size="sm">
                {coordMode === 'RANDOM_REGION' ? 'Random Region' : 'User Input'}
              </Badge>
            </div>
          </div>
        </div>

        <Input
          label="Minecraft Username *"
          required
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. Notch or PlayerName"
        />

        <Input
          label="Quantity / Kit Count"
          type="number"
          required
          min="1"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value) || 1)}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-mdb-text-secondary flex items-center gap-2">
              <Navigation size={12} className="text-mdb-primary" />
              Custom Coordinates
            </label>
            <Toggle
              checked={useCustomCoords}
              onChange={setUseCustomCoords}
              label={useCustomCoords ? 'Hide' : 'Specify'}
            />
          </div>

          {useCustomCoords ? (
            <div className="grid grid-cols-2 gap-4 p-3 bg-mdb-bg rounded-lg border border-mdb-border">
              <Input
                label="Target X"
                type="number"
                value={targetX}
                onChange={(e) => setTargetX(e.target.value)}
                placeholder="e.g. 1500"
              />
              <Input
                label="Target Z"
                type="number"
                value={targetZ}
                onChange={(e) => setTargetZ(e.target.value)}
                placeholder="e.g. -2300"
              />
              <p className="col-span-2 text-[11px] text-mdb-text-muted flex items-center gap-1 mt-1">
                <ShieldCheck size={12} className="text-mdb-success shrink-0" />
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

        <div className="pt-4 flex gap-4 border-t border-mdb-border">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!username.trim()}
            className="flex-1"
          >
            Dispatch
          </Button>
        </div>
      </form>
    </Modal>
  );
}
