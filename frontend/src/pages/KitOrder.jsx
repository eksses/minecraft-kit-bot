import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';

export default function KitOrder() {
  const [chests, setChests] = useState([]);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState({ chestId: '', botName: '', itemName: '', quantity: 1 });
  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([api.fleet.getChests(), api.fleet.getBots()]);
        setChests(c);
        setBots(b);
      } catch (err) {
        addToast({ type: 'error', title: 'Failed to load data' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleOrder = async (e) => {
    e.preventDefault();
    try {
      await api.fleet.createTask({
        type: 'KIT_DELIVERY',
        targetChestId: order.chestId,
        assignedBotId: order.botName,
        details: { itemName: order.itemName, quantity: order.quantity },
      });
      setOrder({ chestId: '', botName: '', itemName: '', quantity: 1 });
      addToast({ type: 'success', title: 'Kit ordered' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to submit order' });
    }
  };

  if (loading) {
    return <div style={{padding: '48px', textAlign: 'center', color: 'var(--text-muted)'}}>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Kit</h1>
          <p className="page-subtitle">Request item delivery from chest to bot</p>
        </div>
      </div>

      <div className="card" style={{maxWidth: '500px'}}>
        <div className="card-header">
          <span className="card-title">Create Delivery Order</span>
        </div>
        <form onSubmit={handleOrder}>
          <div className="form-group">
            <label className="form-label">Source Chest</label>
            <select value={order.chestId} onChange={(e) => setOrder({...order, chestId: e.target.value})} required>
              <option value="">Select a chest...</option>
              {chests.map(c => <option key={c.id} value={c.id}>{c.name} ({c.itemName})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Bot</label>
            <select value={order.botName} onChange={(e) => setOrder({...order, botName: e.target.value})}>
              <option value="">Auto-assign</option>
              {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input type="text" value={order.itemName} onChange={(e) => setOrder({...order, itemName: e.target.value})} required placeholder="diamond" />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input type="number" min="1" max="64" value={order.quantity} onChange={(e) => setOrder({...order, quantity: parseInt(e.target.value)})} required />
          </div>
          <button type="submit" className="btn btn-primary w-full">Submit Order</button>
        </form>
      </div>
    </div>
  );
}
