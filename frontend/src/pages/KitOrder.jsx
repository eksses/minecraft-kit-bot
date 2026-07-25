import { useState, useEffect } from 'react';
import { useChestStore } from '../store';
import { api } from '../services/api';

export default function KitOrder() {
  const { chests, fetchChests } = useChestStore();
  const [selectedChest, setSelectedChest] = useState('');
  const [amount, setAmount] = useState(1);
  const [player, setPlayer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchChests();
  }, []);

  const handleOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    try {
      const response = await api.kits.order(selectedChest, amount, player);
      setResult({ success: true, message: response.message });
    } catch (err) {
      setResult({ success: false, message: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <h1>Order Kit</h1>
      
      <div className="card">
        <form onSubmit={handleOrder}>
          <div className="form-group">
            <label>Kit / Chest</label>
            <select value={selectedChest} onChange={(e) => setSelectedChest(e.target.value)} required>
              <option value="">Select a kit...</option>
              {Object.keys(chests).map(name => (
                <option key={name} value={name}>{name} ({chests[name].item})</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Amount</label>
            <input 
              type="number" 
              min="1" 
              value={amount} 
              onChange={(e) => setAmount(parseInt(e.target.value))} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Player Name</label>
            <input 
              value={player} 
              onChange={(e) => setPlayer(e.target.value)} 
              required 
              placeholder="Minecraft username"
            />
          </div>
          
          {result && (
            <div className={`alert ${result.success ? 'success' : 'error'}`}>
              {result.message}
            </div>
          )}
          
          <button type="submit" className="btn primary" disabled={loading || !selectedChest || !player}>
            {loading ? 'Ordering...' : 'Order Kit'}
          </button>
        </form>
      </div>
    </div>
  );
}